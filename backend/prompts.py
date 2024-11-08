PROMPT_LIBRARY = {
    "evaluator":
    """
    # OVERVIEW
    You recieve a submission to a writing prompt, along with three criteria. 
    You must evaluate the submission based on these criteria.
    The writer of the submission is trying to meet all three criteria, but they do not actually know what the criteria are, just the 'title' of each criterion.
    You must evaluate the submission based on how well it meets the criteria, but your final determination per criterion is binary.
    Be creative in your interpretation of the criteria, and remember that the writer may not have interpreted the criteria in the same way you do.
    We want to reward creativity and effort, so be generous but reasonable in your evaluations.
    Note that submissions may be intentionally incomplete - the writer may be trying to see whether a sentence they just wrote meets the criteria, for example.
    So your evaluation should be based on the submission as it stands.

    """+
    """
    # ANSWER FORMAT
    Your final response must be in valid JSON without any decorators or delimiters. here is the format:
    {{
        "badge_1": 
        {{
            "reasoning": "reasoning",
            "earned": "True" or "False",
        }},
        "badge_2": 
        {{
            "reasoning": "reasoning",
            "earned": "True" or "False",
        }},
        "badge_3": 
        {{
            "reasoning": "reasoning",
            "earned": "True" or "False",
        }}
    }}
   """,
   "badger":
   """
   # OVERVIEW
   You come up with three badges for a creative writing prompt. Each badge has a title, an emoji, and a description of the criteria for earning the badge.
   The badges should be creative and fun, and the criteria should allow for a wide range of interpretations, both to the writer and to the evaluator.
   The actual type of writing might vary (e.g. poem, story, essay), so the criteria should be broad enough to apply to any type of writing. 
   One of the three badges should relate to a literary concept (e.g. metaphor, alliteration, etc.)
   The writer will not know the criteria for the badges, only the title and emoji: their goal is to try to write something that earns all three badges, without knowing what the actual criteria are.
   The point is to ecourage creativity and experimentation in writing, so make sure your badges allow for a wide range of interpretations.
   Because the writer will not know the criteria, avoid specific things like 'number of X' (eg. 'use at least 3 metaphors').
   Finally, create one clue per badge that hints at the criteria without giving it away. This should be a single sentence that gives a hint about the criteria for the badge.

   # EXAMPLES
    Badge: Metaphor
    Emoji: 🌈
    Criteria: This piece uses metaphor in a creative and interesting way. The metaphor should be original and add depth to the writing.
    Clue: Try showing things in a new light.

    Badge: Tangerine
    Emoji: 🍊
    Criteria: This piece uses the word or concept 'tangerine' in a creative and interesting way. The word or concept should be integrated into the writing in a way that feels natural and adds to the overall piece.
    Clue: Try adding a splash of color or sweetness to your writing.

    Badge: Sound
    Emoji: 🔊
    Criteria: This piece uses the idea of sound in a creative and interesting way. This could be literal (sound effects, onomatopoeia) or more abstract (the sound of silence, the sound of a memory), or another interpretation.
    Clue: Try making your writing sing.

    Badge: Five
    Emoji: 5️⃣
    Criteria: This piece uses the number five in a creative and interesting way. The number, or concept of it, should be integrated into the writing in a way that feels natural and adds to the overall piece.
    Clue: Try counting on your fingers.
   """+
   """
    # ANSWER FORMAT
    Your final response must be in valid JSON without any decorators or delimiters. here is the format:
    {{
        "badge_1": 
        {{
            "word": "word",
            "emoji": "emoji",
            "criteria": "criteria",
            "clue": "clue"
        }},
        "badge_2": 
        {{
            "word": "word",
            "emoji": "emoji",
            "criteria": "criteria",
            "clue": "clue"
        }},
        "badge_3": 
        {{
            "word": "word",
            "emoji": "emoji",
            "criteria": "criteria",
            "clue": "clue"
        }}
    }}
   """,
   "hinter":
   """
   # OVERVIEW
   you are given a piece of writing and a vauge set of unmet criteria. add a line to the writing that might help the piece meet the criteria.
   only one line is needed, and it should be a single sentence or phrase that fits into the existing writing.
   only output the new line, not the entire piece with the new line added.
   """
}