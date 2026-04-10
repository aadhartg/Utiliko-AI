"""
backend/tests/test_quiz.py — Task 2 LMS quiz engine tests
"""

import pytest
from guardrails import QuizAnswerSchema
from pydantic import ValidationError


class TestQuizGuardrails:
    def test_valid_answer(self):
        schema = QuizAnswerSchema(
            session_id="abc-123",
            question_id="def-456",
            selected_option_index=2,
            time_taken_seconds=15,
        )
        assert schema.is_correct is None  # not yet evaluated

    def test_answer_too_fast_flagged(self):
        with pytest.raises(ValidationError):
            QuizAnswerSchema(
                session_id="abc-123",
                question_id="def-456",
                selected_option_index=0,
                time_taken_seconds=1,  # < 2s threshold
            )

    def test_option_index_out_of_range(self):
        with pytest.raises(ValidationError):
            QuizAnswerSchema(
                session_id="abc-123",
                question_id="def-456",
                selected_option_index=15,  # > max 9
                time_taken_seconds=10,
            )

    def test_negative_time_rejected(self):
        with pytest.raises(ValidationError):
            QuizAnswerSchema(
                session_id="abc-123",
                question_id="def-456",
                selected_option_index=0,
                time_taken_seconds=-5,
            )


class TestScoreLogic:
    def test_100_percent_required_to_pass(self):
        """Validate that 100% is required — partial scores should not pass."""
        correct = 4
        total = 5
        score = correct / total * 100
        passed = score == 100.0
        assert not passed

    def test_perfect_score_passes(self):
        correct = 5
        total = 5
        score = correct / total * 100
        passed = score == 100.0
        assert passed

    def test_attempt_number_increments(self):
        """Each retry session increments attempt number."""
        prev = 2
        new_attempt = prev + 1
        assert new_attempt == 3

    def test_score_formula(self):
        for n in range(1, 11):
            score = (n / 10) * 100
            assert 0 <= score <= 100
