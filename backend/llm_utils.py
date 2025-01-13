from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_anthropic import ChatAnthropic
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
import asyncio

class Agent:
    def __init__(self, model_shorthand, system_prompt, history=False, json_mode=False):
        self.model_shorthand = model_shorthand
        self.system_prompt = system_prompt
        self.history = history
        self.json_mode = json_mode
        self.chain = None

    async def initialize(self):
        self.chain = initialize_chain(self.model_shorthand, self.system_prompt, self.history, self.json_mode)
        self.model = self.model_shorthand

    async def respond_to(self, input):
        if not self.chain:
            await self.initialize()
        return await conversation_engine(self.chain, input)
    
def initialize_chain(model_shorthand,system_prompt, history=False, json_mode=False):
    JSON_MODES = {
    'gemini':
    {
        "response_mime_type": "application/json",
    },
    'gpt':
    {
        "response_format": {"type":"json_object"},
    },
    '4o':
    {
        "response_format": {"type":"json_object"},
    },
    'sonnet':
    {
    "title": "update",
    "description": "addition to essay based on user comment",
    "type": "object",
    "properties": {
        "text": {
            "type": "string",
            "description": "the new text to be added to the essay",
            },
        "update_type": {
            "type": "string",
            "description": "either insert_before or insert_after",
            },
        },
    "required": ["text", "update_type"],
        },
    }

    output_parser = StrOutputParser()
    
    model_name = {
        'gpt':'gpt-4o-mini',
        'llama':'llama3-8b-8192',
        'sonnet':'claude-3-5-sonnet-20241022',
        '4o':'gpt-4o',
        'gemini': 'gemini-2.0-flash-exp',
        'haiku': 'claude-3-5-haiku-20241022'
    }

    name = model_name[model_shorthand]

    model_farm = {
        'gpt':ChatOpenAI,
        'llama':ChatGroq,
        'sonnet':ChatAnthropic,
        '4o':ChatOpenAI,
        'gemini':ChatGoogleGenerativeAI,
        'haiku':ChatAnthropic
    }

    if model_shorthand == 'gemini':
        loop = asyncio.get_event_loop()
        if json_mode:
            schema = JSON_MODES['gemini']
            model = model_farm[model_shorthand](model=name, model_kwargs=schema, loop=loop)
        else:
            model = model_farm[model_shorthand](model=name, loop=loop)
    elif model_shorthand == 'sonnet' and json_mode:
        schema = JSON_MODES['sonnet']
        model = model_farm[model_shorthand](model=name).with_structured_output(schema)
    else:
        if json_mode:
            schema = JSON_MODES[model_shorthand]
            model = model_farm[model_shorthand](model=name, model_kwargs=schema)
        else:
            model = model_farm[model_shorthand](model=name)

    if history:
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    system_prompt,
                ),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human","{input}"),
            ]
        )
        base_chain = prompt | model | output_parser
        message_history = ChatMessageHistory()
        chain = RunnableWithMessageHistory(
            base_chain,
            lambda session_id: message_history,
            input_messages_key="input",
            history_messages_key="chat_history",
        )

    else:
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    system_prompt
                ),
                (
                    "human",
                    "{input}"
                )
            ]
        )
        chain = prompt | model | output_parser

    return chain

# runs one turn of a conversation
async def conversation_engine(chain, input):
    message = await chain.ainvoke({"input": input},
                        {"configurable": {"session_id": "unused"}})
    return message

