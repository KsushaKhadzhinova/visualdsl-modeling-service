from lark import Lark, UnexpectedInput

# Исправленная EBNF-грамматика языка UDL
udl_grammar = r"""
start: statement*
statement: class_decl | relation | comment

class_decl: "class" NAME "{" class_body "}"
class_body: (property | method)*
property: SIGNED_NAME ":" TYPE
method: SIGNED_NAME "(" ")"
relation: NAME ARROW NAME [":" STRING]
comment: /\/\/[^\n]*/

ARROW: /(-->|<--|<->|--|->|<-)/
SIGNED_NAME: /[+\-#][A-Za-z_][A-Za-z0-9_]*/
NAME: /[A-Za-z_][A-Za-z0-9_]*/
TYPE: /[A-Za-z0-9_<>\[\]]+/
STRING: /\".*?\"/

%import common.WS_INLINE
%ignore WS_INLINE
%ignore /\s+/ 
"""

# Инициализация парсера LALR
parser = Lark(udl_grammar, start="start", parser="lalr")

class UDLParseError(Exception):
    """Пользовательское исключение для ошибок синтаксиса UDL."""
    pass

def parse_udl(source: str) -> str:
    """
    Парсит исходный код UDL и возвращает дерево разбора в текстовом виде.
    """
    try:
        tree = parser.parse(source)
        return tree.pretty()
    except UnexpectedInput as exc:
        # Выбрасываем понятную ошибку для бэкенда
        raise UDLParseError(str(exc))