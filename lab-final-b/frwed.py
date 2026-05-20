from openai import OpenAI
import os

client = OpenAI(
    api_key=("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"),
    base_url="https://api.groq.com/openai/v1"
)

response = client.chat.completions.create(
    model="llama-3.1-8b-instant",
    messages=[
        {
            "role": "user",
            "content": "Explain the importance of fast language models"
        }
    ]
)

print(response.choices[0].message.content)