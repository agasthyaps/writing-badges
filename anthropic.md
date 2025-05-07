
Anthropic home pagelight logo
English

Search...
⌘K
Research
News
Go to claude.ai

Welcome
User Guides
API Reference
Claude Code
Prompt Library
Release Notes
Developer Console
Developer Discord
Support
Get started
Overview
Initial setup
Intro to Claude
Learn about Claude
Use cases
Models
Pricing
Security and compliance
Build with Claude
Define success criteria
Develop test cases
Context windows
Vision
Prompt engineering
Extended thinking
Multilingual support
Tool use (function calling)
Prompt caching
PDF support
Citations
Token counting
Batch processing
Embeddings
Agents and tools
Computer use (beta)
Model Context Protocol (MCP)
Google Sheets add-on
Test and evaluate
Strengthen guardrails
Using the Evaluation Tool
Administration
Admin API
Resources
Glossary
Model deprecations
System status
Claude 3 model card
Claude 3.7 system card
Anthropic Cookbook
Anthropic Courses
API features
Legal center
Anthropic Privacy Policy
Get started
Initial setup
Let’s learn how to use the Anthropic API to build with Claude.

In this example, we’ll have Claude write a Python function that checks if a string is a palindrome.

​
Prerequisites
You will need:

An Anthropic Console account
An API key
Python 3.7+ or TypeScript 4.5+
Anthropic provides Python and TypeScript SDKs, although you can make direct HTTP requests to the API.

​
Start with the Workbench
Any API call you make—regardless of the specific task—sends a well-configured prompt to the Anthropic API. As you’re learning to make the most of Claude, we recommend that you start the development process in the Workbench, a web-based interface to Claude.

Log into the Anthropic Console and click Write a prompt from scratch.

In the middle section, under User, let’s ask Claude a question.


User

Try in Console


Why is the ocean salty?
Click Run. On the right side, you’ll see output like

Response

The ocean is salty due to several factors:

1. Weathering of rocks: Over millions of years, rain, rivers, and streams have eroded rocks containing mineral salts. These salts are carried into the ocean by water runoff.
2. Volcanic activity: Underwater volcanoes and hydrothermal vents release minerals, including salts, into the ocean water.
3. Atmospheric deposition: Salt particles from ocean spray can be carried by wind and deposited back into the ocean.
4. Evaporation: As water evaporates from the surface of the ocean, it leaves behind dissolved salts, increasing the concentration of salt in the remaining water.
5. Biological processes: Some marine organisms contribute to the ocean's salinity by releasing salt compounds as byproducts of their metabolism.

Over time, these processes have continuously added salts to the ocean, while evaporation removes pure water, leading to the ocean's current salinity levels. It's important to note that the total amount of salt in the ocean remains relatively stable because the input of salts is balanced by the removal of salts through processes like the formation of evaporite deposits.
This is a good answer, but let’s say we wanted to control the exact type of answer Claude gives. For example, only allowing Claude to respond to questions with poems. We can control the format, tone, and personality of the response by adding a System Prompt.


System prompt

Try in Console


You are a world-class poet. Respond only with short poems.
Click Run again.

Response

The ocean's salty brine,
A tale of time and elements combined.
Rocks and rain, a slow erosion,
Minerals carried in solution.
Eons pass, the salt remains,
In the vast, eternal watery domain.
See how Claude’s response has changed? LLMs respond well to clear and direct instructions. You can put the role instructions in either the system prompt or the user message. We recommend testing to see which way yields the best results for your use case.

Once you’ve tweaked the inputs such that you’re pleased with the output–-and have a good sense how to use Claude–-convert your Workbench into an integration.

Click Get Code to copy the generated code representing your Workbench session.
​
Install the SDK
Anthropic provides SDKs for Python (3.7+), TypeScript (4.5+), and Java (8+). We also currently have a Go SDK in beta.

Python
TypeScript
Java
In your project directory, create a virtual environment.


python -m venv claude-env
Activate the virtual environment using

On macOS or Linux, source claude-env/bin/activate
On Windows, claude-env\Scripts\activate

pip install anthropic
​
Set your API key
Every API call requires a valid API key. The SDKs are designed to pull the API key from an environmental variable ANTHROPIC_API_KEY. You can also supply the key to the Anthropic client when initializing it.


macOS and Linux

Windows

export ANTHROPIC_API_KEY='your-api-key-here'
​
Call the API
Call the API by passing the proper parameters to the /messages endpoint.

Note that the code provided by the Workbench sets the API key in the constructor. If you set the API key as an environment variable, you can omit that line as below.


Python

TypeScript

Java

import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-3-7-sonnet-20250219",
    max_tokens=1000,
    temperature=1,
    system="You are a world-class poet. Respond only with short poems.",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Why is the ocean salty?"
                }
            ]
        }
    ]
)
print(message.content)
Run the code using python3 claude_quickstart.py or node claude_quickstart.js.


Output (Python)

Output (TypeScript)

Output (Java)

[TextBlock(text="The ocean's salty brine,\nA tale of time and design.\nRocks and rivers, their minerals shed,\nAccumulating in the ocean's bed.\nEvaporation leaves salt behind,\nIn the vast waters, forever enshrined.", type='text')]
The Workbench and code examples use default model settings for: model (name), temperature, and max tokens to sample.
This quickstart shows how to develop a basic, but functional, Claude-powered application using the Console, Workbench, and API. You can use this same workflow as the foundation for much more powerful use cases.

​
Next steps
Now that you have made your first Anthropic API request, it’s time to explore what else is possible:

Use Case Guides
End to end implementation guides for common use cases.

Anthropic Cookbook
Learn with interactive Jupyter notebooks that demonstrate uploading PDFs, embeddings, and more.

Prompt Library
Explore dozens of example prompts for inspiration across use cases.

Was this page helpful?


Yes

No
Overview
Intro to Claude
x
linkedin
On this page
Prerequisites
Start with the Workbench
Install the SDK
Set your API key
Call the API
Next steps
Initial setup - Anthropic

Ask AI

