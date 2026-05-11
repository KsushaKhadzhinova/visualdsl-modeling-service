import pytest
from udl_project.backend.parser_engine import parse_udl, UDLParseError

def test_parse_valid_class():
    """Тест: Определение простого класса"""
    code = "class User { +name: String }"
    result = parse_udl(code)
    assert "class_decl" in result
    assert "User" in result

def test_parse_relation():
    """Тест: Связь между объектами"""
    code = "User --> Order : \"creates\""
    result = parse_udl(code)
    assert "relation" in result
    assert "creates" in result

def test_parse_comments():
    """Тест: Игнорирование комментариев"""
    code = "// Это комментарий\nclass Admin {}"
    result = parse_udl(code)
    assert "class_decl" in result

def test_parse_invalid_syntax():
    """Тест: Обработка синтаксической ошибки"""
    with pytest.raises(UDLParseError):
        parse_udl("not_a_keyword User {")