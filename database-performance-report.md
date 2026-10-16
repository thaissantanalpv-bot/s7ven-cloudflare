# Database performance and running credits — 2026-10-16

## Recorded financial baseline

Window: 2026-10-03 00:00 UTC to 2026-10-16 00:47:45 UTC (current day partial; recording can lag activity).
These are requested credits, not reconciled deductions or cash paid. Returned project usage was not truncated.

| Item | Known quantity | Requested credits |
| --- | --- | ---: |
| Build mode | Unknown | 221.900000 |
| Database pico compute | 14.25 instance-hours | 1.103224 |
| Uncached egress | 4.702061 GB | 2.115928 |
| Cached egress | 0.066507 GB | 0.009976 |
| Worker usage | 106 worker-days | 1.060000 |
| AI gateway | Unknown resource quantities | 1.172848 |
| Realtime | 106 messages | 0.001325 |
| File storage | 1.739906 GB-hours | 0.000250 |
| Total | Mixed units | 227.363550 |

Running usage excluding build: 5.463550 requested credits. Database-storage usage was not returned; its billed quantity is unknown, not zero.
Current pico quote: 0.0774192 credits/active hour; database storage quote: 0.00085616 credits/GB-hour, before allowances.
Neither quotes nor requested amounts establish cash payments.

## Load and query evidence

- Health: DB/pool up, memory 67%, disk 15%, connections 21/60, pool clients 6/200, database 13.2 MB; no recent exhaustion alert.
- Statistics are cumulative over their own collection window, not necessarily the financial window.
- Public sales projection: 1,830 calls, 9,520.48 ms total, 5.202 ms mean.
- Highest raw administrative catalog read: 821 calls, 5,024.60 ms total, 6.12 ms mean.
- Main settings read: 979 calls, 225.11 ms total, 0.23 ms mean.
- Catalog: 199 estimated live rows, 172 KiB before indexes; 424,629 cumulative sequential scans and 48.9 million rows examined.
- Existing primary-key index supports catalog ordering (199 rows, 0.245 ms reconstructed read); another ordering index would be wasteful.
- Sessions, quotes, roles and orders already have relevant indexes. Small tables do not justify speculative indexes.
- No HTTP schedules returned. Direct cron inspection was prohibited; absence of all scheduled jobs is unverified.

## Applied change

Migration `0021_catalog_photo_lookup_indexes.sql` adds B-tree cover-path and GIN gallery expression indexes matching existing linked-photo predicates exactly.
Policies, grants, private storage, pricing, stock reservation, polling and all data remain unchanged.
Indexes add 56 KiB and some product-write maintenance.

Same read-only workload checks each of 199 cover paths against the unchanged authorization predicate:

| Measurement | Before | After |
| --- | ---: | ---: |
| Execution time | 16.336 ms | 4.545 ms |
| Shared buffer hits | 1,741 | 1,006 (plus 4 reads) |
| Inner lookup | 199 sequential scans | Bitmap lookup using both indexes |

This single comparison is approximately 72% faster, not a production latency percentile or guaranteed financial saving.
All 199 cover paths still matched a product. The diagnostic role could not execute the security-definer function; its equivalent read predicate and real public photos were checked instead.

## Verification and remaining cost drivers

13 catalog/photo/editor tests passed. Browser verification rendered public product photos and entered real authenticated product management without writing orders/products. Build log: OK.

Build work is the largest recorded expense, not database compute. Network transfer is the largest returned running category; this baseline does not attribute bytes to individual photos/responses.
Full catalog signing/reads and 5-second admin refreshes remain request-volume candidates. Extending freshness or disabling background checks can delay updates/audio alerts and requires approval; neither was changed silently.
Pico is already the smallest listed tier. No resize, pause, deletion or retention change was made.
Faster SQL does not change compute's per-active-hour rate. Financial savings remain unverified until active hours and transfer are compared over representative periods after reporting catches up, in Settings → Plans & credit usage → Usage details.