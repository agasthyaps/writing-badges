# Reimplementation of simple async LLM wrapper without LangChain
# Uses official SDKs from OpenAI, Anthropic, and Google Generative AI (Gemini)
# Conventions follow the attached SDK docs.

import os
import asyncio
from typing import List, Dict, Optional, Tuple

from openai import AsyncOpenAI  # OpenAI official async client
import anthropic  # Anthropic official SDK (sync only)
from google import genai  # Google Gemini SDK per latest docs

__all__ = ["Agent"]

# ------------------------------------------------------------
# Configuration helpers
# ------------------------------------------------------------

# Map shorthand → (provider, model_name)
_MODEL_REGISTRY: Dict[str, Tuple[str, str]] = {
    "gpt41mini": ("openai", "gpt-4.1-mini-2025-04-14"),
    "gpt41nano": ("openai", "gpt-4.1-nano"),
    "gpt41": ("openai", "gpt-4.1"),
    # Anthropic models
    "sonnet": ("anthropic", "claude-3-5-sonnet-20241022"),
    "haiku": ("anthropic", "claude-3-5-haiku-20241022"),
    # Google
    "gemini": ("gemini", "gemini-2.5-flash"),
}

# Default generation params per provider
_DEFAULT_PARAMS = {
    "openai": {
        "temperature": 0.7,
        "max_tokens": 1024,
    },
    "anthropic": {
        "max_tokens": 1024,
        "temperature": 0.7,
    },
    "gemini": {
        "temperature": 0.7,
        "max_output_tokens": 2048,
    },
}

def remove_preamble(text: str) -> str:
    """remove the preamble "```json\n" from the start of the text" and the closing "```" from the end of the text"""
    return text.split("```json\n")[1].split("\n```")[0]


class Agent:
    """Light-weight conversational wrapper around multiple LLM providers.

    Args:
        model_shorthand: One of the keys in _MODEL_REGISTRY (e.g. "gpt", "4o").
        system_prompt: System instructions that set the behavior of the assistant.
        history: If True, keeps running chat history for a single Agent instance.
        json_mode: If True, requests the model to return valid JSON via the
                    provider-specific mechanism (OpenAI response_format, Gemini
                    JSON MIME type, etc.).
    """

    def __init__(
        self,
        model_shorthand: str,
        system_prompt: str,
        history: bool = False,
        json_mode: bool = False,
    ):
        if model_shorthand not in _MODEL_REGISTRY:
            raise ValueError(f"Unknown model shorthand: {model_shorthand}")

        self.model_shorthand = model_shorthand
        self.system_prompt = system_prompt.strip() if system_prompt else ""
        self.keep_history = history
        self.json_mode = json_mode

        self._provider, self._model_name = _MODEL_REGISTRY[model_shorthand]
        self._history: List[Dict[str, str]] = []  # list of {role, content}

        # Initialise provider-specific clients lazily
        self._openai_client: Optional[AsyncOpenAI] = None
        self._anthropic_client: Optional[anthropic.Anthropic] = None
        self._gemini_client: Optional["genai.Client"] = None  # type: ignore

    # --------------------------------------------------------
    # Public API
    # --------------------------------------------------------

    async def respond_to(self, user_input: str) -> str:
        """Send *user_input* to the underlying model and return assistant text."""
        if self._provider == "openai":
            return await self._call_openai(user_input)
        elif self._provider == "anthropic":
            return await self._call_anthropic(user_input)
        elif self._provider == "gemini":
            return await self._call_gemini(user_input)
        else:
            raise RuntimeError(f"Unsupported provider: {self._provider}")

    # --------------------------------------------------------
    # Provider-specific implementations
    # --------------------------------------------------------

    async def _call_openai(self, user_input: str) -> str:
        if self._openai_client is None:
            self._openai_client = AsyncOpenAI()

        messages = self._build_messages(user_input)
        kwargs = _DEFAULT_PARAMS["openai"].copy()

        if self.json_mode:
            # Conventions from OpenAI docs: response_format={"type": "json_object"}
            kwargs["response_format"] = {"type": "json_object"}

        response = await self._openai_client.chat.completions.create(
            model=self._model_name,
            messages=messages,
            **kwargs,
        )

        assistant_content = response.choices[0].message.content
        self._maybe_store_messages(user_input, assistant_content)
        return assistant_content

    async def _call_anthropic(self, user_input: str) -> str:
        # Anthropics Python SDK is sync; run in executor to keep async interface
        if self._anthropic_client is None:
            self._anthropic_client = anthropic.Anthropic()

        async def _run_sync():
            messages = self._build_anthropic_messages(user_input)
            params = _DEFAULT_PARAMS["anthropic"].copy()
            params.update(
                {
                    "model": self._model_name,
                    "messages": messages,
                    "system": self.system_prompt or None,
                }
            )
            return self._anthropic_client.messages.create(**params)

        response = await asyncio.to_thread(_run_sync)
        # Anthropic returns list of content blocks
        assistant_content = "".join(block.text for block in response.content)
        self._maybe_store_messages(user_input, assistant_content)
        return assistant_content

    async def _call_gemini(self, user_input: str) -> str:
        # Lazy-init the client using latest SDK pattern
        if self._gemini_client is None:
            api_key = (
                os.getenv("GEMINI_API_KEY")
                or os.getenv("GOOGLE_API_KEY")
                or os.getenv("GOOGLE_GENAI_API_KEY")
            )
            if not api_key:
                raise ValueError("Google GenAI API key not found. Please set GEMINI_API_KEY, GOOGLE_API_KEY, or GOOGLE_GENAI_API_KEY environment variable.")
            self._gemini_client = genai.Client(api_key=api_key)

        client = self._gemini_client

        # Compose the contents list (system instructions handled separately)
        contents: List[str] = []
        if self.system_prompt:
            contents.append(self.system_prompt)
        if self.keep_history:
            contents.extend([m["content"] for m in self._history])
        contents.append(user_input)

        # Create config object with generation parameters
        config = genai.types.GenerateContentConfig(
            temperature=_DEFAULT_PARAMS["gemini"]["temperature"],
            max_output_tokens=_DEFAULT_PARAMS["gemini"]["max_output_tokens"]
        )

        try:
            # Run the sync Gemini API call in a thread pool
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=self._model_name,
                contents=contents,
                config=config
            )

            # Handle potential errors in response
            if not response or not hasattr(response, "text"):
                raise ValueError("Invalid response from Gemini API")
            
            response_text = response.text
            self._maybe_store_messages(user_input, response_text)
            print(response_text)
            return response_text

        except Exception as e:
            print(f"Error in Gemini API call: {str(e)}")
            raise

    # --------------------------------------------------------
    # Helpers
    # --------------------------------------------------------

    def _build_messages(self, user_input: str) -> List[Dict[str, str]]:
        """Create OpenAI-style message list including system prompt and history."""
        messages: List[Dict[str, str]] = []
        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})
        if self.keep_history and self._history:
            messages.extend(self._history)
        messages.append({"role": "user", "content": user_input})
        return messages

    def _build_anthropic_messages(self, user_input: str) -> List[Dict[str, str]]:
        # Anthropic uses same structure but system prompt separate param
        history = self._history if self.keep_history else []
        full_history = history.copy()
        full_history.append({"role": "user", "content": user_input})
        return full_history

    def _maybe_store_messages(self, user_input: str, assistant_content: str):
        if not self.keep_history:
            return
        self._history.append({"role": "user", "content": user_input})
        self._history.append({"role": "assistant", "content": assistant_content})

