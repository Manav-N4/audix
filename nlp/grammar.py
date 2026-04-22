import language_tool_python
import re
import time

_tool = language_tool_python.LanguageTool("en-US")

# Rule categories that are safe to auto-fix
SAFE_RULES = {
    "UPPERCASE_SENTENCE_START",
    "PUNCTUATION_PARAGRAPH_END",
    "DOUBLE_PUNCTUATION",
    "EN_A_VS_AN",
    "SENTENCE_WHITESPACE",
}

def fix_grammar(text: str) -> str:
    if not text.strip():
        return text

    start = time.time()

    try:
        matches = _tool.check(text)
        
        # Guard against weird match objects or API issues
        for match in reversed(matches):
            rule_id = getattr(match, 'ruleId', None) or getattr(match, 'rule_id', None)
            
            if rule_id and rule_id in SAFE_RULES and getattr(match, 'replacements', None):
                offset = getattr(match, 'offset', 0)
                length = getattr(match, 'errorLength', len(getattr(match, 'errorText', '')))
                
                if offset + length <= len(text):
                    text = (
                        text[:offset]
                        + match.replacements[0]
                        + text[offset + length :]
                    )
                    
        return text.strip()
        
    except Exception as e:
        print(f"[Grammar] Safety bypass: {str(e)}")
        return text.strip()
