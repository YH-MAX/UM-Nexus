from sqlalchemy.ext.compiler import compiles
from sqlalchemy.types import UserDefinedType


class Vector(UserDefinedType):
    cache_ok = True

    def __init__(self, dimensions: int) -> None:
        self.dimensions = dimensions

    def get_col_spec(self, **kw) -> str:
        return f"vector({self.dimensions})"


@compiles(Vector, "sqlite")
def compile_vector_sqlite(type_: Vector, compiler, **kw) -> str:
    return "TEXT"
