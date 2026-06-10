import json
import re
from flask import current_app


class AIIntentService:
    """
    Interprets user's natural language prompt and returns preferred meal_ids.
    Does ONE thing: language → meal selection.
    Scheduling is handled by MealFilterService.
    """

    def select_meals(self, prompt: str, safe_meals: list) -> list:
        """
        Sends one request to Qwen via Hugging Face.
        Returns list of meal_ids ordered by preference, or empty list on failure.

        Args:
            prompt: User's natural language description (e.g., "I want something spicy")
            safe_meals: List of Meal objects (filtered by allergies/diets)

        Returns:
            List of meal_ids ordered by preference, or empty list if AI fails
        """
        if not safe_meals:
            return []

        # Build minimal meal list for the prompt (just id and name)
        meal_list = [{"meal_id": m.meal_id, "meal_name": m.meal_name} for m in safe_meals]

        system_prompt = (
            "You are a Cameroonian meal planning assistant. "
            "The user will describe what they feel like eating. "
            "From the available meals list, select the ones that best match what they want. "
            "Respond ONLY with a JSON array of meal_ids, ordered by how well they match. "
            "Example: [5, 12, 3, 28]. "
            "No explanation. No markdown. Just the array."
        )

        user_message = (
            f"User says: '{prompt}'\n\n"
            "Available meals:\n"
            f"{json.dumps(meal_list, ensure_ascii=False)}\n\n"
            "Return the meal_ids that best match what the user wants, "
            "ordered by preference. Return ALL matching meal_ids. "
            "If nothing matches, return all meal_ids in any order."
        )

        try:
            raw_response = self._call_model(system_prompt, user_message)

            # Strip markdown fences
            cleaned = self._strip_markdown_fences(raw_response)

            # Parse as JSON array
            meal_ids = json.loads(cleaned)

            # Validate each id is in safe_meals
            safe_ids = {m.meal_id for m in safe_meals}
            validated = [mid for mid in meal_ids if isinstance(mid, int) and mid in safe_ids]

            return validated if validated else []

        except Exception as exc:
            print(f"[ai_intent_service] Meal selection failed: {exc}")
            return []

    def _call_model(self, system_prompt: str, user_message: str) -> str:
        """
        Makes the actual Hugging Face API call.

        Args:
            system_prompt: System message for the model
            user_message: User message for the model

        Returns:
            Raw model response string

        Raises:
            RuntimeError if HF_TOKEN is missing
            Any huggingface_hub exception on network/API failure
        """
        from huggingface_hub import InferenceClient

        token = current_app.config.get("HF_TOKEN", "")
        if not token:
            raise RuntimeError(
                "HF_TOKEN is not configured on the server. "
                "Set the HF_TOKEN environment variable."
            )

        client = InferenceClient(
            model="Qwen/Qwen2.5-7B-Instruct",
            token=token,
        )

        response = client.chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=256,
        )

        return response.choices[0].message.content

    def _strip_markdown_fences(self, text: str) -> str:
        """Remove ```json ... ``` or ``` ... ``` wrappers from model output."""
        text = text.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
        return text.strip()
