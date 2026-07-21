import type { TransmissionDef } from "../../types";

const CHANNEL = "#unbank-fee1000d";

export const campaignTransmissions: TransmissionDef[] = [
  {
    after: "campaign-start",
    format: "chatlog",
    channel: CHANNEL,
    lines: [
      { handle: "SYSTEM", text: `— now talking in ${CHANNEL} —`, timestamp: "00:00" },
      { handle: "fee1000d", text: "new face. good. we need hands more than we need names.", timestamp: "00:01" },
      { handle: "null", text: "who's \"we\"", timestamp: "00:01" },
      { handle: "wraith", text: "nobody. that's the point. you'll never meet fee1000d in person and neither have most of us.", timestamp: "00:02" },
      { handle: "sable", text: "the target's Concord Financial Group. say it out loud once, then never again — everyone in here just calls it Discord Financial.", timestamp: "00:03" },
      { handle: "sable", text: "on paper: a debt-buying and data-broker holding company. buys medical and personal debt for pennies through a stack of shell subsidiaries, keeps every one of those people one missed payment from ruin, then sells the same people's data to the underwriters who'll deny their next loan application.", timestamp: "00:04" },
      { handle: "sable", text: "it's a closed loop. the debt manufactures the data, the data manufactures more debt. nobody at the top ever has to look at a single account.", timestamp: "00:05" },
      { handle: "wraith", text: "we're not going to out-lawyer a holding company. we're going to out-enumerate one.", timestamp: "00:06" },
      { handle: "fee1000d", text: "goal isn't a headline. it's a number — the master reconciliation job Discord's whole subsidiary network settles against, every night, unattended. get write access to that, and for one run, the number tells the truth instead of the story.", timestamp: "00:07" },
      { handle: "fee1000d", text: "nobody above you is going to hand you a target list with a bow on it. you find the first thread, you pull it, and you report back what's actually there — same as every operation you've already run.", timestamp: "00:08" },
      { handle: "null", text: "and if it doesn't work", timestamp: "00:09" },
      { handle: "fee1000d", text: "then it doesn't work, and we made every subsidiary in that stack a little more honest anyway just by making them look. start with the front door — there's always a front door.", timestamp: "00:10" },
    ],
  },
  {
    after: "campaign-1",
    format: "chatlog",
    channel: CHANNEL,
    lines: [
      { handle: "sable", text: "reused password, credential-stuffed, and a directory export nobody expected anyone to actually read.", timestamp: "00:00" },
      { handle: "sable", text: "the export is the real win. Bellwether and Concord Receivables aren't separate companies playing nice. one's a shell, the other files the same tax address. that's two of maybe forty nodes in the stack, confirmed.", timestamp: "00:01" },
      { handle: "wraith", text: "forty. that's not a company, that's a family tree somebody built specifically so no single regulator ever sees the whole thing at once.", timestamp: "00:02" },
      { handle: "null", text: "how do we even scope forty subsidiaries", timestamp: "00:03" },
      { handle: "fee1000d", text: "you don't scope the tree. you find the vendors everyone in the tree trusts and never audits. that's smaller, and it's already how the tree talks to itself.", timestamp: "00:04" },
      { handle: "fee1000d", text: "the directory export named a managed IT contractor. start there.", timestamp: "00:05" },
    ],
  },
  {
    after: "campaign-2",
    format: "chatlog",
    channel: CHANNEL,
    lines: [
      { handle: "wraith", text: "a build pipeline with the deploy keys sitting in plaintext in a log nobody rotates. classic. every subsidiary that contractor touches trusted those keys by default.", timestamp: "00:00" },
      { handle: "sable", text: "and one of the subsidiaries those keys reach is a cloud account holding company — which means every SaaS tool the smaller shells rent seats on all trusts back into it.", timestamp: "00:01" },
      { handle: "null", text: "so instead of forty companies it's like… four platforms, all trusting each other", timestamp: "00:02" },
      { handle: "wraith", text: "worse. it's four platforms that all trust each other AND forty companies that all trust those four platforms. every seam is somebody else's problem right up until it's everybody's.", timestamp: "00:03" },
      { handle: "fee1000d", text: "good. that's the sprawl episode. don't try to be clean about it — this one's supposed to be a mess. follow every trust relationship you find, not just the tidy one.", timestamp: "00:04" },
    ],
  },
  {
    after: "campaign-3",
    format: "chatlog",
    channel: CHANNEL,
    lines: [
      { handle: "SYSTEM", text: `— fee1000d has been away 11h —`, timestamp: "00:00" },
      { handle: "sable", text: "four organizations, one shared trust graph, and we're sitting on read access to more of the SaaS estate than Discord's own security team probably has mapped.", timestamp: "00:01" },
      { handle: "null", text: "that's a lot of access. what do we actually do with it", timestamp: "00:02" },
      { handle: "wraith", text: "nothing yet. access isn't the objective, it's inventory. write it down, move on.", timestamp: "00:03" },
      { handle: "SYSTEM", text: `— fee1000d has joined ${CHANNEL} —`, timestamp: "00:04" },
      { handle: "fee1000d", text: "someone inside flagged us. not law enforcement — an actual employee, on a subsidiary floor, who's watched Discord zero out a widow's disputed balance and then quietly re-add it two billing cycles later.", timestamp: "00:05" },
      { handle: "fee1000d", text: "they left a way in on purpose. an old remote-access gateway that was supposed to be decommissioned when the contractor's engagement ended. it wasn't.", timestamp: "00:06" },
      { handle: "sable", text: "an inside track feels different from a misconfiguration.", timestamp: "00:07" },
      { handle: "fee1000d", text: "it is different. treat it like one — confirm everything twice. but don't turn it down.", timestamp: "00:08" },
    ],
  },
  {
    after: "campaign-4",
    format: "chatlog",
    channel: CHANNEL,
    lines: [
      { handle: "null", text: "we're inside the loan-servicing platform now. this is the actual machine.", timestamp: "00:00" },
      { handle: "wraith", text: "the machine has bugs like everything else does. business logic nobody load-tested against somebody trying to break it on purpose.", timestamp: "00:01" },
      { handle: "sable", text: "I've been reading the reconciliation code for two days. there's a nightly batch job that trusts every subsidiary's submitted numbers and just… sums them. no cross-check against the source ledgers unless a human flags a discrepancy by hand.", timestamp: "00:02" },
      { handle: "sable", text: "that job is the number fee1000d's been talking about since day one.", timestamp: "00:03" },
      { handle: "fee1000d", text: "confirmed. that's the target. three more things to prove on the platform itself before we're anywhere near write access to that job — do them in order, this is the one episode where sequence actually matters.", timestamp: "00:04" },
      { handle: "null", text: "and after that", timestamp: "00:05" },
      { handle: "fee1000d", text: "after that we talk about what \"zeroing the number\" actually means, before anyone's finger is anywhere near the trigger. that conversation happens for real, not as a slogan.", timestamp: "00:06" },
    ],
  },
  {
    after: "campaign-5",
    format: "chatlog",
    channel: CHANNEL,
    lines: [
      { handle: "wraith", text: "write access to the nightly reconciliation job. one run, unattended, tonight.", timestamp: "00:00" },
      { handle: "null", text: "so we're doing it. wiping the ledger.", timestamp: "00:01" },
      { handle: "sable", text: "that's not a clean button, null. that job doesn't distinguish between a subsidiary that's been strong-arming grieving families for six years and a subsidiary that's mostly just badly run. zero it and both go to zero. every account, no triage, no appeal.", timestamp: "00:02" },
      { handle: "wraith", text: "there's a second option and it's a real one, not a cop-out. we don't touch the job at all — we pull the reconciliation proof itself, the internal math that shows exactly how the debt-and-data loop actually works, and we hand it to a journalist and a state regulator who've been asking the right questions for a year with nothing to point at.", timestamp: "00:03" },
      { handle: "sable", text: "slower. less total. nobody's balance moves tonight. but it's their choice being taken away by due process, not by us, and it holds up in a way a wiped database doesn't.", timestamp: "00:04" },
      { handle: "null", text: "and fee1000d wants which one", timestamp: "00:05" },
      { handle: "fee1000d", text: "fee1000d isn't the one with their hands on the keyboard tonight. that call is whoever's actually sitting at that terminal when the access is live. both are real. neither is free. choose, and own it.", timestamp: "00:06" },
    ],
  },
  {
    after: "campaign-6",
    format: "dossier",
    channel: undefined,
    lines: [
      { handle: "DOCUMENT", text: "INTERNAL — CONCORD FINANCIAL GROUP — OFFICE OF THE CONTROLLER", timestamp: "CLASSIFICATION: RESTRICTED" },
      { handle: "DOCUMENT", text: "RE: Anomalous access — nightly reconciliation job, all subsidiary segments", timestamp: "" },
      { handle: "DOCUMENT", text: "This memo was not authored by Concord Financial Group. It was recovered from Concord's own document management system, unmodified, and is reproduced here exactly as filed internally the morning after.", timestamp: "" },
      { handle: "DOCUMENT", text: "\"...unauthorized write access to the master reconciliation process was confirmed at 02:14. Duration of access: 41 minutes. Scope: full subsidiary network (37 of 41 active shells; 4 dormant). Legal and Communications have been briefed. No public statement is recommended at this time.\"", timestamp: "" },
      { handle: "DOCUMENT", text: "— attached appendix, redacted in the original —", timestamp: "" },
    ],
    variantLines: {
      ending_wipe: [
        { handle: "DOCUMENT", text: "\"...the reconciliation job completed its run with every subsidiary balance zeroed, across all four segments, with no differentiation by account history, dispute status, or delinquency cause. Recovery of the pre-incident ledger state is not expected to be possible; nightly snapshots for the prior 90 days were themselves overwritten as part of the same run.\"", timestamp: "" },
        { handle: "SYSTEM", text: `— now talking in ${CHANNEL} —`, timestamp: "" },
        { handle: "wraith", text: "it's done. every balance in the network, gone. the ones that should never have existed and the ones that maybe should have — all of it, at once.", timestamp: "" },
        { handle: "sable", text: "I keep thinking about the accounts that weren't predatory. small ones. somebody's actual car loan, routed through the wrong shell by accident. those are gone too. we don't get to pick and choose after the fact.", timestamp: "" },
        { handle: "null", text: "so was it right", timestamp: "" },
        { handle: "fee1000d", text: "it was total, and it was unilateral, and nobody voted on it except whoever was at the keyboard. that's not the same question as whether it was right. sit with that — don't let the headline answer it for you.", timestamp: "" },
        { handle: "fee1000d", text: "Discord Financial goes back to zero tonight. so does everyone it ever touched. we don't get to choose which of those facts we're proud of.", timestamp: "" },
      ],
      ending_leak: [
        { handle: "DOCUMENT", text: "\"...no unauthorized modification to account balances or ledger state was identified. Access was limited to read operations against the reconciliation process's audit trail. The extracted material has since appeared in the possession of external parties, including at least one financial regulator and one journalist with prior reporting on the debt-servicing industry.\"", timestamp: "" },
        { handle: "SYSTEM", text: `— now talking in ${CHANNEL} —`, timestamp: "" },
        { handle: "sable", text: "nothing moved. every balance is exactly where it was this morning. but the proof is out now, and it's real proof — not a rumor, not a leak that can be denied. the actual math.", timestamp: "" },
        { handle: "wraith", text: "slower. a regulator has to act on it, a journalist has to write it, a court has to eventually decide something. none of that happens tonight, or maybe this year.", timestamp: "" },
        { handle: "null", text: "does it actually change anything", timestamp: "" },
        { handle: "fee1000d", text: "maybe. maybe just for the families in the appendix, maybe for the whole shell structure, maybe not at all — depends who reads it and what they're willing to do with it now that they can't say they didn't know.", timestamp: "" },
        { handle: "fee1000d", text: "we didn't get to decide that part. we just made it impossible to keep not knowing. that's the whole job, most nights.", timestamp: "" },
      ],
    },
  },
];

export const transmissionsByAfter: Record<string, TransmissionDef> = Object.fromEntries(
  campaignTransmissions.map((t) => [t.after, t]),
);
