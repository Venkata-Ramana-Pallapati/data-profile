from sqlalchemy import inspect
from database import engine, get_db
from fastapi import Depends

def get_keys_relations(db=Depends(get_db)):
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    key_relations = {}

    for table in tables:
        primary_keys = inspector.get_pk_constraint(table)["constrained_columns"]

        foreign_keys = inspector.get_foreign_keys(table)

        relations = []
        for fk in foreign_keys:
            relations.append({
                "column": fk["constrained_columns"],
                "references_table": fk["referred_table"],
                "references_column": fk["referred_columns"]
            })

        key_relations[table] = {
            "primary_keys": primary_keys,
            "foreign_keys": relations
        }

    return {"key_relationships": key_relations}
