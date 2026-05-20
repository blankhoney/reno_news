# Digest Editions Are Persisted Reviewable Objects

Second-version digest output becomes a persisted digest edition instead of only a dynamic preview.

A digest edition is a stable replay object with an edition id, date or window, selected items, generation metadata, status, and review metadata. Once created, replaying that edition should not silently change because source items or ranking signals later changed.

The MVP dynamic preview can continue to exist as an exploratory surface, but it is not the production artifact for daily review, replay, or future delivery. Delivery channels remain out of scope until persisted editions and review workflows are reliable.

This makes digest behavior auditable and gives admins a stable object to inspect before any email, push, or external distribution work is added.
