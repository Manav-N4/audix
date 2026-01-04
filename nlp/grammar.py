import language_tool_python

_tool = language_tool_python.LanguageTool('en-US')

def fix_grammar(text: str) -> str:
    return _tool.correct(text)
