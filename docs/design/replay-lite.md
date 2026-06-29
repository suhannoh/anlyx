# Timing And Replay Notes

Timing and replay are not part of the Phase 1 default product surface.

The viewer may keep compatibility code for older flow/replay surfaces, but the
current Project JSON viewer must keep Timing disabled unless real
`measurements` are present.

## Rules

- Do not show measured timing from source-derived architecture order.
- Do not imply live runtime tracing from static Project JSON.
- Do not add replay controls to the default Pages / Map / JSON workflow.
- Future timing work must use `docs/agent/anlyx-local-probe-contract.md` and
  must write explicit measurement evidence.
