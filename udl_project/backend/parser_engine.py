"""UDL parser (Simple text -> pretty parse tree)."""

from lark import Lark, UnexpectedInput


# EBNF grammar for UDL
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


parser = Lark(udl_grammar, start="start", parser="lalr")


class UDLParseError(Exception):
    """User-friendly exception for UDL parse errors."""


def parse_udl(source: str) -> str:
    """Parse UDL and return `tree.pretty()`."""
    try:
        tree = parser.parse(source)  # type: ignore[no-any-return]
        return tree.pretty()
    except UnexpectedInput as exc:
        raise UDLParseError(str(exc))

