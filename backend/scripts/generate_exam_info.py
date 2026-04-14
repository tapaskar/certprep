#!/usr/bin/env python3
"""Generate exam info (tips, resources, prep strategy) using Ollama gemma4:31b-cloud."""
import json, time, sys, re, urllib.request
from pathlib import Path

SEED_DIR = Path("/Volumes/wininstall/prepally/backend/data/seed")
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "gemma4:31b-cloud"
MAX_RETRIES = 3


def call_ollama(prompt):
    body = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.7, "num_predict": 6000},
    }).encode()
    for attempt in range(MAX_RETRIES):
        try:
            req = urllib.request.Request(OLLAMA_URL, data=body, headers={"Content-Type": "application/json"})
            resp = urllib.request.urlopen(req, timeout=300)
            data = json.loads(resp.read())
            return data.get("response", "")
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                wait = 5 * (attempt + 1)
                print(f"    retry {attempt+1}/{MAX_RETRIES} after {wait}s ({e})")
                time.sleep(wait)
            else:
                raise


def parse_json(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return None


def generate_exam_info(exam_dir_name):
    exam_dir = SEED_DIR / exam_dir_name
    exam_file = exam_dir / "exam.json"
    info_file = exam_dir / "exam_info.json"

    if not exam_file.exists():
        return False

    if info_file.exists():
        print(f"  {exam_dir_name}: already has exam_info.json — skip")
        return True

    with open(exam_file) as f:
        exam = json.load(f)

    code = exam["code"]
    name = exam["name"]
    provider = exam["provider"]
    domains = exam.get("domains", [])
    guide_url = exam.get("exam_guide_url", "")

    domain_text = "\n".join(f"  - {d['name']} ({d['weight_pct']}%)" for d in domains)

    # Map provider to official training/cert portal
    provider_portals = {
        "aws": "https://aws.amazon.com/certification/",
        "azure": "https://learn.microsoft.com/en-us/certifications/",
        "gcp": "https://cloud.google.com/learn/certification",
        "comptia": "https://www.comptia.org/certifications",
        "nvidia": "https://www.nvidia.com/en-us/training/",
    }

    prompt = f"""You are a JSON API. Output ONLY valid JSON, no markdown.

Generate detailed exam preparation info for {code} ({name}) by {provider.upper()}.

Exam domains:
{domain_text}

Official exam guide: {guide_url}

Return this exact JSON structure:
{{
  "exam_id": "{exam['id']}",
  "overview": "<2-3 paragraph overview of what the exam tests, who should take it, and prerequisites>",
  "difficulty_rating": <1-5 integer>,
  "average_study_weeks": <integer>,
  "cost_usd": <exam cost in USD>,
  "validity_years": <how many years cert is valid>,
  "recertification_info": "<how to recertify>",
  "official_resources": [
    {{"title": "...", "url": "...", "type": "exam_guide|training|docs|practice"}},
  ],
  "preparation_tips": [
    "<tip 1>",
    "<tip 2>",
    ... (8-10 actionable tips)
  ],
  "exam_day_tips": [
    "<tip about the actual exam experience>",
    ... (5-6 tips)
  ],
  "recommended_experience": "<what experience level is recommended>",
  "related_certifications": [
    {{"code": "...", "name": "...", "relationship": "prerequisite|next_step|complementary"}}
  ],
  "key_services_to_know": ["<service1>", "<service2>", ... (top 10-15 services/technologies)]
}}"""

    print(f"  {code}: {name}")
    try:
        text = call_ollama(prompt)
        parsed = parse_json(text)
        if parsed:
            with open(info_file, "w") as f:
                json.dump(parsed, f, indent=2)
            print(f"    => Saved exam_info.json")
            return True
        else:
            print(f"    FAILED: could not parse JSON")
            return False
    except Exception as e:
        print(f"    FAILED: {e}")
        return False


if __name__ == "__main__":
    targets = sys.argv[1:] if len(sys.argv) > 1 else None
    success = 0
    total = 0

    if targets:
        for t in targets:
            total += 1
            if generate_exam_info(t):
                success += 1
    else:
        for d in sorted(SEED_DIR.iterdir()):
            if d.is_dir() and (d / "exam.json").exists():
                total += 1
                if generate_exam_info(d.name):
                    success += 1

    print(f"\nDONE. {success}/{total} exam info files generated.")
