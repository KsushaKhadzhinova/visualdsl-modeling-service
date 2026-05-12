"""
Парсер для UDL (Universal Diagram Language).
Использует Lark LALR парсер для построения AST.
"""
from typing import Any

from lark import Lark, UnexpectedInput, LarkError
from lark.tree import Tree

from ..core import logger

# Грамматика UDL языка (EBNF)
UDL_GRAMMAR = r"""
start: statement*


statement: class_decl 
         | relation 
         | comment

class_decl: "class" NAME "{" class_body "}"
class_body: (property | method)*
property: SIGNED_NAME ":" TYPE
method: SIGNED_NAME "(" ")"

relation: NAME ARROW NAME [":" STRING]
comment: /\/\/.*$/

ARROW: /(-->|<--|<->|--|->|<-)/
SIGNED_NAME: /[+\-#][A-Za-z_][A-Za-z0-9_]*/
NAME: /[A-Za-z_][A-Za-z0-9_]*/
TYPE: /[A-Za-z0-9_<>\[\]]+/
STRING: /\".*?\"/

%import common.WS_INLINE
%ignore WS_INLINE
%ignore /\s+/
%ignore /\/\/.*$/
"""

# Инициализируем парсер LALR
_parser = Lark(UDL_GRAMMAR, start="start", parser="lalr")


class UDLParseError(Exception):
    """Исключение при ошибке парсинга UDL."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def parse_udl(source_code: str) -> str:
    """
    Парсит исходный код UDL и возвращает красиво отформатированное AST дерево.
    
    Args:
        source_code: Текст кода на языке UDL
        
    Returns:
        Красивое представление AST дерева в виде строки
        
    Raises:
        UDLParseError: При ошибках синтаксиса
    """
    if not source_code or not source_code.strip():
        raise UDLParseError("Код диаграммы не может быть пустым")

    try:
        logger.debug(f"Parsing UDL code: {len(source_code)} characters")
        tree = _parser.parse(source_code)
        result = tree.pretty()
        logger.info(f"UDL parsing successful, tree depth: {_count_depth(tree)}")
        return result
    except UnexpectedInput as exc:
        error_msg = f"Синтаксическая ошибка на позиции {exc.pos_in_stream}: {exc.get_context(source_code)}"
        logger.warning(f"UDL parse error: {error_msg}")
        raise UDLParseError(error_msg)
    except LarkError as exc:
        error_msg = f"Ошибка парсера: {str(exc)}"
        logger.error(f"UDL Lark error: {error_msg}")
        raise UDLParseError(error_msg)
    except Exception as exc:
        error_msg = f"Неожиданная ошибка: {str(exc)}"
        logger.error(f"UDL unexpected error: {error_msg}", exc_info=True)
        raise UDLParseError(error_msg)


def _count_depth(tree: Tree, depth: int = 0) -> int:
    """Вспомогательная функция для подсчета глубины дерева."""
    if hasattr(tree, "children"):
        if tree.children:
            return max(_count_depth(child, depth + 1) for child in tree.children)
        return depth
    return depth
