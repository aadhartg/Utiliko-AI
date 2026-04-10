from enum import Enum
from typing import List, Dict, Any
from sqlalchemy import inspect, func
from sqlalchemy.orm import declarative_base, Session


class BaseMixin:
    _original_data = None
    _is_changed = False

    def __repr__(self):
        fields = ", ".join(
            f"{c.key}={getattr(self, c.key)!r}"
            for c in inspect(self).mapper.column_attrs
        )
        return f"<{self.__class__.__name__}({fields})>"

    def _load_data(self):
        if not self._original_data:
            session = inspect(self).session
            if self.id is not None:
                db_instance = session.query(type(self)).get(self.id)
                if db_instance:
                    self._original_data = {
                        c.key: getattr(db_instance, c.key)
                        for c in inspect(db_instance).mapper.column_attrs
                    }

    def _has_changes(self):
        self._load_data()
        dirty = {}
        for key in self._original_data or {}:
            if getattr(self, key) != self._original_data[key]:
                dirty[key] = (self._original_data[key], getattr(self, key))
        self._dirty = dirty
        return bool(dirty)

    @property
    def is_changed(self):
        return self._is_changed

    @classmethod
    def pluck(cls, db_session, *fields):
        query = db_session.query(*(getattr(cls, f) for f in fields))
        if len(fields) == 1:
            return [getattr(row, fields[0]) for row in query.all()]
        return [list(row) for row in query.all()]

    @classmethod
    def count(cls, db_session):
        return db_session.query(cls).count()

    @classmethod
    def first(cls, db_session):
        return db_session.query(cls).order_by(cls.id.asc()).first()

    @classmethod
    def last(cls, db_session):
        return db_session.query(cls).order_by(cls.id.desc()).first()

    def set_value(self, field: str, value):
        if isinstance(getattr(type(self), field).type, Enum):
            setattr(self, field, value.value if isinstance(value, Enum) else value)
        else:
            setattr(self, field, value)

    @classmethod
    def get_or_create_items(
        cls,
        db_session: Session,
        items: List[Dict[str, Any]],
        match_field: str = "name",
        pk_field: str = "id",
    ) -> List[int]:
        """
        Dynamically check and create items in the DB.

        Args:
            db_session: SQLAlchemy session
            items: List of dictionaries with data to insert
            match_field: Field to use for case-insensitive matching (default: 'name')
            pk_field: Name of the primary key field (default: 'id')

        Returns:
            List of primary key values (existing or newly created), type depends on pk_field
        """
        ids = []

        for item in items:
            if match_field not in item:
                raise ValueError(f"Missing match field '{match_field}' in item: {item}")

            match_value = item[match_field].strip()

            match_column = getattr(cls, match_field)

            existing = (
                db_session.query(cls)
                .filter(func.lower(match_column) == match_value.lower())
                .first()
            )

            if existing:
                pk_value = getattr(existing, pk_field)
                ids.append(pk_value)
            else:
                new_instance = cls(**item)
                db_session.add(new_instance)
                db_session.commit()
                pk_value = getattr(new_instance, pk_field)
                ids.append(pk_value)

        return ids


Base = declarative_base(cls=BaseMixin)
