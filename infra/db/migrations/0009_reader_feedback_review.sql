alter table reader_feedback
  add column if not exists review_status text not null default 'open',
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz;

alter table reader_feedback
  drop constraint if exists reader_feedback_review_status_check;

alter table reader_feedback
  add constraint reader_feedback_review_status_check
  check (review_status in ('open', 'reviewed', 'dismissed', 'resolved'));

alter table reader_feedback
  drop constraint if exists reader_feedback_review_note_check;

alter table reader_feedback
  add constraint reader_feedback_review_note_check
  check (
    review_note is null
    or (length(trim(review_note)) > 0 and length(review_note) <= 2000)
  );

create index if not exists reader_feedback_review_status_idx
  on reader_feedback(review_status);
