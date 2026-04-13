#!/usr/bin/env python3
"""Generate exam questions using Ollama. Default: gemma4:31b-cloud."""
import json, time, sys, re, urllib.request
from pathlib import Path

SEED_DIR = Path("/Volumes/wininstall/prepally/backend/data/seed")
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "gemma4:31b-cloud"
QUESTIONS_PER_EXAM = 75
BATCH_SIZE = 5  # gemma4 handles 5 well

MAX_RETRIES = 3

def call_ollama(prompt):
    body = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.7, "num_predict": 10000},
    }).encode()
    for attempt in range(MAX_RETRIES):
        try:
            req = urllib.request.Request(OLLAMA_URL, data=body, headers={"Content-Type": "application/json"})
            resp = urllib.request.urlopen(req, timeout=600)
            data = json.loads(resp.read())
            return data.get("response", "")
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                wait = 5 * (attempt + 1)
                print(f"    retry {attempt+1}/{MAX_RETRIES} after {wait}s ({e})")
                time.sleep(wait)
            else:
                raise

def parse_questions(text):
    """Extract question array from LLM response."""
    # Try direct JSON parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            for key in ["questions", "data", "items", "results"]:
                if key in parsed and isinstance(parsed[key], list):
                    return parsed[key]
            if "stem" in parsed:
                return [parsed]
        return []
    except json.JSONDecodeError:
        pass

    # Try extracting JSON from text (gemma4 sometimes wraps with markdown)
    match = re.search(r'\{[\s\S]*"questions"\s*:\s*\[[\s\S]*\]\s*\}', text)
    if match:
        try:
            parsed = json.loads(match.group())
            return parsed.get("questions", [])
        except json.JSONDecodeError:
            pass

    # Try extracting a JSON array
    match = re.search(r'\[[\s\S]*\]', text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return []

def generate_exam(exam_dir_name):
    exam_dir = SEED_DIR / exam_dir_name
    exam_file = exam_dir / "exam.json"
    if not exam_file.exists():
        print(f"No exam.json in {exam_dir_name}")
        return 0

    with open(exam_file) as f:
        exam = json.load(f)

    exam_id = exam["id"]
    exam_code = exam["code"]
    exam_name = exam["name"]
    domains = exam.get("domains", [])
    if not domains:
        return 0

    questions_file = exam_dir / "questions.json"
    existing = []
    if questions_file.exists():
        with open(questions_file) as f:
            existing = json.load(f)
        if len(existing) >= QUESTIONS_PER_EXAM:
            print(f"  {exam_code}: already has {len(existing)} questions — skip")
            return 0

    print(f"\n{'='*50}")
    print(f"{exam_code}: {exam_name}")
    print(f"  Model: {MODEL} | Target: {QUESTIONS_PER_EXAM} | Existing: {len(existing)}")
    print(f"{'='*50}")

    total_weight = sum(d.get("weight_pct", 0) for d in domains)
    all_questions = list(existing)
    q_num = len(existing) + 1

    for domain in domains:
        domain_id = domain["id"]
        domain_name = domain["name"]
        target = max(2, round(QUESTIONS_PER_EXAM * domain["weight_pct"] / total_weight))

        # Subtract existing questions for this domain
        existing_for_domain = sum(1 for q in existing if q.get("domain_id") == domain_id)
        target = max(0, target - existing_for_domain)
        if target == 0:
            print(f"  Domain: {domain_name} — already has enough, skip")
            continue

        print(f"  Domain: {domain_name} ({target} questions)")
        remaining = target

        while remaining > 0:
            batch = min(BATCH_SIZE, remaining)

            prompt = f"""You are a JSON API. Output ONLY valid JSON, no markdown, no explanation.

Generate {batch} {exam_code} ({exam_name}) certification exam questions for domain: {domain_name}.

Rules:
- Scenario-based, difficulty 4/5
- 4 options (A-D), exactly ONE correct
- Each question tests a DIFFERENT concept within this domain
- Include detailed explanations for why correct AND why each wrong option is wrong
- Questions must be challenging and realistic, testing deep understanding

{{"questions": [{{"domain_id":"{domain_id}","type":"scenario","difficulty":4,"stem":"A company...","options":[{{"id":"A","text":"...","is_correct":false}},{{"id":"B","text":"...","is_correct":true}},{{"id":"C","text":"...","is_correct":false}},{{"id":"D","text":"...","is_correct":false}}],"correct_answer":"B","explanation":{{"why_correct":"...","why_not_A":"...","why_not_C":"...","why_not_D":"..."}},"tags":["service1","concept1"],"estimated_time_seconds":120}}]}}"""

            try:
                text = call_ollama(prompt)
                batch_qs = parse_questions(text)

                for q in batch_qs:
                    q["id"] = f"q-{exam_dir_name}-mock1-{q_num:03d}"
                    q["exam_id"] = exam_id
                    q.setdefault("domain_id", domain_id)
                    q.setdefault("concept_ids", [])
                    q["decision_tree_id"] = None
                    q.setdefault("bkt_p_guess", 0.25)
                    q.setdefault("bkt_p_slip", 0.1)
                    q.setdefault("bkt_p_transit", 0.1)
                    q["review_status"] = "approved"
                    q.setdefault("estimated_time_seconds", 120)
                    q.setdefault("tags", [])
                    all_questions.append(q)
                    q_num += 1

                got = len(batch_qs)
                remaining -= max(got, batch)
                print(f"    got {got} (total: {len(all_questions)})")

                # Save after each successful batch
                with open(questions_file, "w") as f:
                    json.dump(all_questions, f, indent=2)
            except Exception as e:
                print(f"    FAILED: {e}")
                remaining -= batch

    print(f"  => Saved {len(all_questions)} questions to {questions_file.name}")
    return len(all_questions)

if __name__ == "__main__":
    targets = sys.argv[1:] if len(sys.argv) > 1 else None
    total = 0

    if targets:
        for t in targets:
            total += generate_exam(t)
    else:
        for d in sorted(SEED_DIR.iterdir()):
            if d.is_dir() and (d / "exam.json").exists():
                total += generate_exam(d.name)

    print(f"\n{'='*50}")
    print(f"DONE. Total questions generated: {total}")
