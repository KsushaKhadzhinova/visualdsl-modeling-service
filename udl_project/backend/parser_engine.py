from lark import Lark, UnexpectedInput

udl_grammar = r"""
start: statement*
statement: class_decl | relation | comment | empty_line
class_decl: "class" NAME "{" class_body "}"
class_body: (property | method)*
property: SIGNED_NAME ":" TYPE
method: SIGNED_NAME "(" ")"
relation: NAME ARROW NAME [":" STRING]
comment: /\/\/.*$/
empty_line: /\s*/

ARROW: /(-->|<--|<->|--|->|<-)/
SIGNED_NAME: /[+\-#][A-Za-z_][A-Za-z0-9_]*/
NAME: /[A-Za-z_][A-Za-z0-9_]*/
TYPE: /[A-Za-z0-9_<>\[\]]+/
STRING: /\".*?\"/

%import common.WS_INLINE
%ignore WS_INLINE
%ignore /\n+/ 
"""

parser = Lark(udl_grammar, start="start", parser="lalr")

class UDLParseError(Exception):
    pass


def parse_udl(source: str) -> str:
    try:
        tree = parser.parse(source)
        return tree.pretty()
    except UnexpectedInput as exc:
        raise UDLParseError(str(exc))
