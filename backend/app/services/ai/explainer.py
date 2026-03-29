"""Claude API integration for contextual explanations."""

import anthropic

from app.config import settings

EXPLANATION_PROMPT = (  # noqa: E501
    "You are an AWS Solutions Architect exam tutor. "
    "A student just answered a question incorrectly.\n"
    "\nQUESTION:\n{question_stem}\n"
    "\nSTUDENT'S ANSWER: {selected_option} — \"{selected_text}\""
    "\nCORRECT ANSWER: {correct_option} — \"{correct_text}\""
    "\n\nSTUDENT'S MASTERY CONTEXT:"
    "\n- Current mastery of {primary_concept}: {mastery_level} ({mastery_pct}%)"
    "\n- This is their {attempt_number}th attempt at questions on this concept"
    "\n- Confidence self-report: {confidence_level}"
    "\n{misconception_flag}"
    "\n\nCURATED EXPLANATION (use as ground truth, rephrase for the student):"
    "\nWhy correct: {why_correct}"
    "\nWhy their answer is wrong: {why_selected}"
    "\n\nINSTRUCTIONS:"
    "\n1. Start with what they likely thought (based on their wrong answer)"
    "\n2. Explain the specific gap in their reasoning (1-2 sentences)"
    "\n3. Give the correct mental model (2-3 sentences)"
    "\n4. If misconception detected: be direct that this is a common trap"
    "\n5. End with a connecting insight to a related concept they DO understand"
    "\n6. Keep total response under 150 words"
    "\n7. Use concrete AWS terminology, not abstract language"
)


async def generate_explanation(
    question_stem: str,
    selected_option: str,
    selected_text: str,
    correct_option: str,
    correct_text: str,
    primary_concept: str,
    mastery_level: str,
    mastery_pct: int,
    attempt_number: int,
    confidence_level: str,
    why_correct: str,
    why_selected: str,
    is_misconception: bool = False,
) -> str:
    """Generate a personalized explanation using Claude API."""
    misconception_flag = (  # noqa: E501
        "** MISCONCEPTION DETECTED: Student answered quickly with high confidence "
        "but got it wrong. Address this directly. **"
        if is_misconception
        else ""
    )

    prompt = EXPLANATION_PROMPT.format(
        question_stem=question_stem,
        selected_option=selected_option,
        selected_text=selected_text,
        correct_option=correct_option,
        correct_text=correct_text,
        primary_concept=primary_concept,
        mastery_level=mastery_level,
        mastery_pct=mastery_pct,
        attempt_number=attempt_number,
        confidence_level=confidence_level,
        misconception_flag=misconception_flag,
        why_correct=why_correct,
        why_selected=why_selected,
    )

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    message = await client.messages.create(
        model=settings.ai_model,
        max_tokens=settings.ai_max_tokens,
        temperature=settings.ai_temperature,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text
