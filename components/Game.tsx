"use client";

import { useEffect, useMemo, useState } from "react";
import type { Difficulty, NodeRunState, NotebookEntry, SaveData, TrainingProgress } from "@/lib/game/types";
import { missionsByDifficulty, missionsById } from "@/lib/game/chains";
import { transmissionsByAfter, nextCampaignMissionId } from "@/lib/game/chains/campaign";
import {
  loadSave,
  saveProgress,
  resetSave,
  loadNotebook,
  saveNotebook,
  loadTrainingProgress,
  saveTrainingProgress,
  loadExamAttempt,
  saveExamAttempt,
  resetExamAttempt,
} from "@/lib/game/storage";
import { generateRunRandomization } from "@/lib/game/randomize";
import type { RunRandomization } from "@/lib/game/randomize";
import { buildExamSnapshot, scoreExamAttempt } from "@/lib/game/scoring";
import { methodology } from "@/lib/game/methodology";
import type { NodeStatus } from "./UsMap";
import type { MissionStatus } from "./MissionSelect";

import BootSequence from "./BootSequence";
import MainMenu from "./MainMenu";
import MissionSelect from "./MissionSelect";
import ChainBriefing from "./ChainBriefing";
import OperationMap from "./OperationMap";
import NodeBriefing from "./NodeBriefing";
import Terminal from "./Terminal";
import NodeComplete from "./NodeComplete";
import ChainComplete from "./ChainComplete";
import Transmission from "./Transmission";
import FieldReport from "./FieldReport";
import Notebook from "./Notebook";
import NotebookToggle from "./NotebookToggle";
import Methodology from "./Methodology";
import MethodologyToggle from "./MethodologyToggle";
import TrainingMode from "./TrainingMode";
import ExamMode from "./ExamMode";
import ExamHud from "./ExamHud";

type Screen =
  | "boot"
  | "menu"
  | "missionSelect"
  | "briefing"
  | "map"
  | "nodeBriefing"
  | "terminal"
  | "nodeComplete"
  | "chainComplete"
  | "transmission"
  | "report"
  | "training"
  | "examMode";

export default function Game() {
  const [screen, setScreen] = useState<Screen>("boot");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [nodeRandomization, setNodeRandomization] = useState<RunRandomization | null>(null);
  // safe as a lazy initializer: the save-dependent UI (MainMenu) only ever renders after
  // the boot screen, well past hydration, so there's no server/client mismatch to worry about
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [chainFlags, setChainFlags] = useState<string[]>([]);
  const [chainHintsUsed, setChainHintsUsed] = useState(0);
  const [chainScopeViolations, setChainScopeViolations] = useState(0);
  const [chainJustCompleted, setChainJustCompleted] = useState(false);
  const [transmissionAfter, setTransmissionAfter] = useState<string | null>(null);

  const [notebook, setNotebook] = useState(() => loadNotebook());
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(() => loadTrainingProgress());
  const [examAttempt, setExamAttempt] = useState(() => loadExamAttempt());

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setMethodologyOpen(false);
        setNotebookOpen((open) => !open);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setNotebookOpen(false);
        setMethodologyOpen((open) => !open);
      } else if (e.key === "Escape") {
        setNotebookOpen(false);
        setMethodologyOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function addNote(text: string, source: string) {
    setNotebook((prev) => {
      if (prev.entries.some((e) => e.text === text && e.source === source)) return prev;
      const entry: NotebookEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, source, text, ts: Date.now() };
      const next = { ...prev, entries: [...prev.entries, entry] };
      saveNotebook(next);
      return next;
    });
  }

  function setNotebookText(text: string) {
    setNotebook((prev) => {
      const next = { ...prev, text };
      saveNotebook(next);
      return next;
    });
  }

  function clearNotebook() {
    const next = { entries: [], text: "" };
    setNotebook(next);
    saveNotebook(next);
  }

  const missions = difficulty ? missionsByDifficulty[difficulty] : [];
  const chain = missionId ? missionsById[missionId] : null;
  const activeNode = useMemo(
    () => chain?.nodes.find((n) => n.id === activeNodeId) ?? null,
    [chain, activeNodeId],
  );
  const securedIds = (missionId && save[missionId]?.securedNodeIds) || [];

  function statusFor(nodeId: string): NodeStatus {
    if (!chain) return "locked";
    if (securedIds.includes(nodeId)) return "secured";
    const idx = chain.nodes.findIndex((n) => n.id === nodeId);
    const priorSecured = chain.nodes.slice(0, idx).every((n) => securedIds.includes(n.id));
    return priorSecured ? "unlocked" : "locked";
  }

  function statusForMission(id: string): MissionStatus {
    if (save[id]?.completedAt) return "secured";
    const list = missions;
    const idx = list.findIndex((m) => m.id === id);
    if (idx <= 0) return "unlocked";
    const prev = list[idx - 1];
    return save[prev.id]?.completedAt ? "unlocked" : "locked";
  }

  function progressFor(d: Difficulty) {
    const list = missionsByDifficulty[d];
    const secured = list.filter((m) => save[m.id]?.completedAt).length;
    return { secured, total: list.length };
  }

  function handleSelectDifficulty(d: Difficulty) {
    setDifficulty(d);
    setScreen("missionSelect");
  }

  function handleSelectMission(id: string) {
    if (examAttempt?.result) {
      setScreen("examMode");
      return;
    }
    setMissionId(id);
    const isFirstCampaignEpisode = difficulty === "campaign" && missionsByDifficulty.campaign[0]?.id === id;
    if (isFirstCampaignEpisode && !save[id] && transmissionsByAfter["campaign-start"]) {
      setTransmissionAfter("campaign-start");
      setScreen("transmission");
      return;
    }
    setScreen("briefing");
  }

  function handleBegin() {
    if (!missionId) return;
    let initialFlags = save[missionId]?.flags ?? [];
    if (difficulty === "campaign") {
      // earlier episodes are always completed first (mission select gates on it), so their
      // discovered flags are available in save — carry them forward into this episode's run
      const priorFlags = missionsByDifficulty.campaign
        .filter((m) => m.id !== missionId)
        .flatMap((m) => save[m.id]?.flags ?? []);
      initialFlags = Array.from(new Set([...priorFlags, ...initialFlags]));
    }
    setChainFlags(initialFlags);
    setChainHintsUsed(save[missionId]?.hintsUsed ?? 0);
    setChainScopeViolations(save[missionId]?.scopeViolations ?? 0);
    setScreen("map");
  }

  function handleSelectNode(nodeId: string) {
    const node = chain?.nodes.find((n) => n.id === nodeId);
    setNodeRandomization(node ? generateRunRandomization(node) : null);
    setActiveNodeId(nodeId);
    setScreen("nodeBriefing");
  }

  function handleSecured(finalState: NodeRunState) {
    if (!missionId || !chain || !activeNodeId) return;
    const mergedFlags = Array.from(new Set([...chainFlags, ...finalState.discoveredFlags]));
    const newSecured = Array.from(new Set([...(save[missionId]?.securedNodeIds ?? []), activeNodeId]));
    const isLast = newSecured.length === chain.nodes.length;
    const totalHints = chainHintsUsed + finalState.hintsUsed;
    const totalScopeViolations = chainScopeViolations + finalState.scopeViolations;

    saveProgress(missionId, newSecured, mergedFlags, totalHints, totalScopeViolations, isLast ? Date.now() : undefined);
    setSave((prev) => ({
      ...prev,
      [missionId]: {
        securedNodeIds: newSecured,
        flags: mergedFlags,
        hintsUsed: totalHints,
        scopeViolations: totalScopeViolations,
        completedAt: isLast ? Date.now() : undefined,
      },
    }));
    setChainFlags(mergedFlags);
    setChainHintsUsed(totalHints);
    setChainScopeViolations(totalScopeViolations);
    setChainJustCompleted(isLast);
    setScreen("nodeComplete");
  }

  function handleNodeCompleteContinue() {
    setScreen(chainJustCompleted ? "chainComplete" : "map");
  }

  function handleChainCompleteContinue() {
    if (difficulty === "campaign" && missionId && transmissionsByAfter[missionId]) {
      setTransmissionAfter(missionId);
      setScreen("transmission");
      return;
    }
    handleBackToMissionSelect();
  }

  function handleTransmissionContinue() {
    if (transmissionAfter === "campaign-start") {
      setTransmissionAfter(null);
      setScreen("briefing");
      return;
    }
    const next = transmissionAfter ? nextCampaignMissionId(transmissionAfter) : null;
    setTransmissionAfter(null);
    if (next) {
      setMissionId(next);
      setScreen("briefing");
    } else {
      handleBackToMissionSelect();
    }
  }

  function handleBackToMissionSelect() {
    setMissionId(null);
    setActiveNodeId(null);
    setScreen("missionSelect");
  }

  function handleBackToMenu() {
    setDifficulty(null);
    setMissionId(null);
    setActiveNodeId(null);
    setScreen("menu");
  }

  function handleOpenReport() {
    setScreen("report");
  }

  function handleOpenTraining() {
    setScreen("training");
  }

  function handleTrainingProgressChange(next: TrainingProgress) {
    setTrainingProgress(next);
    saveTrainingProgress(next);
  }

  function handleOpenExam() {
    setScreen("examMode");
  }

  function handleStartExam() {
    const attempt = {
      startedAt: Date.now(),
      endsAt: Date.now() + methodology.examDay.durationHours * 3600_000,
      startSnapshot: buildExamSnapshot(save),
    };
    saveExamAttempt(attempt);
    setExamAttempt(attempt);
  }

  function handleGradeExam() {
    setExamAttempt((prev) => {
      if (!prev || prev.result) return prev;
      const graded = { ...prev, result: scoreExamAttempt(prev, save) };
      saveExamAttempt(graded);
      return graded;
    });
  }

  function handleRestartExam() {
    resetExamAttempt();
    setExamAttempt(null);
    setScreen("examMode");
  }

  // authoritative expiry check, independent of ExamHud's own display-only interval — fires the
  // grade the instant time runs out, including immediately on load if it expired while the tab
  // was closed (the clock is wall-clock, it doesn't pause for you)
  useEffect(() => {
    if (!examAttempt || examAttempt.result) return;
    function check() {
      if (examAttempt && Date.now() >= examAttempt.endsAt) handleGradeExam();
    }
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examAttempt, save]);

  function handleReset() {
    resetSave();
    setSave({});
  }

  let content: React.ReactNode = null;

  if (screen === "boot") {
    content = <BootSequence onDone={() => setScreen("menu")} />;
  } else if (screen === "menu") {
    content = (
      <MainMenu
        progressFor={progressFor}
        onSelect={handleSelectDifficulty}
        onReset={handleReset}
        onOpenReport={handleOpenReport}
        onOpenTraining={handleOpenTraining}
        onOpenExam={handleOpenExam}
        save={save}
      />
    );
  } else if (screen === "report") {
    content = <FieldReport save={save} onBack={handleBackToMenu} />;
  } else if (screen === "training") {
    content = <TrainingMode progress={trainingProgress} onProgressChange={handleTrainingProgressChange} onBack={handleBackToMenu} />;
  } else if (screen === "examMode") {
    content = (
      <ExamMode
        examAttempt={examAttempt}
        onStart={handleStartExam}
        onEnterMissions={() => {
          setDifficulty("hard");
          setScreen("missionSelect");
        }}
        onEndNow={handleGradeExam}
        onRestart={handleRestartExam}
        onBack={handleBackToMenu}
      />
    );
  } else if (screen === "missionSelect" && difficulty) {
    content = (
      <MissionSelect
        difficulty={difficulty}
        missions={missions}
        statusFor={statusForMission}
        onSelect={handleSelectMission}
        onBack={handleBackToMenu}
      />
    );
  } else if (screen === "transmission" && transmissionAfter && transmissionsByAfter[transmissionAfter]) {
    const isEpilogue = nextCampaignMissionId(transmissionAfter) === null && transmissionAfter !== "campaign-start";
    content = (
      <Transmission
        transmission={transmissionsByAfter[transmissionAfter]}
        flags={chainFlags}
        onContinue={handleTransmissionContinue}
        continueLabel={
          transmissionAfter === "campaign-start" ? "BEGIN EPISODE 1" : isEpilogue ? "BACK TO LEVEL SELECT" : "CONTINUE"
        }
      />
    );
  } else if (!chain) {
    content = null;
  } else if (screen === "briefing") {
    content = <ChainBriefing chain={chain} onBegin={handleBegin} onBack={handleBackToMissionSelect} />;
  } else if (screen === "map") {
    content = (
      <OperationMap chain={chain} statusFor={statusFor} onSelectNode={handleSelectNode} onBack={handleBackToMissionSelect} />
    );
  } else if (screen === "nodeBriefing" && activeNode && nodeRandomization) {
    content = (
      <NodeBriefing
        node={activeNode}
        secured={securedIds.includes(activeNode.id)}
        randomization={nodeRandomization}
        onConnect={() => setScreen("terminal")}
        onBack={() => setScreen("map")}
      />
    );
  } else if (screen === "terminal" && activeNode && nodeRandomization) {
    content = (
      <Terminal
        node={activeNode}
        carryFlags={chainFlags}
        randomization={nodeRandomization}
        onSecured={handleSecured}
        onExit={() => setScreen("map")}
        onNote={addNote}
      />
    );
  } else if (screen === "nodeComplete" && activeNode) {
    const isLastNode = chain.nodes[chain.nodes.length - 1].id === activeNode.id;
    const variantKey = activeNode.debriefVariants
      ? Object.keys(activeNode.debriefVariants).find((k) => chainFlags.includes(k))
      : undefined;
    const debriefLines = variantKey ? activeNode.debriefVariants?.[variantKey] : undefined;
    content = (
      <NodeComplete node={activeNode} isLastNode={isLastNode} onContinue={handleNodeCompleteContinue} debriefLines={debriefLines} />
    );
  } else if (screen === "chainComplete") {
    const hasFollowUpTransmission = difficulty === "campaign" && !!transmissionsByAfter[chain.id];
    content = (
      <ChainComplete
        chain={chain}
        onMenu={handleChainCompleteContinue}
        continueLabel={hasFollowUpTransmission ? "CONTINUE" : undefined}
      />
    );
  }

  return (
    <>
      {content}
      {screen !== "boot" && (
        <div className="fixed top-4 right-4 z-40 flex gap-2">
          <MethodologyToggle onClick={() => { setNotebookOpen(false); setMethodologyOpen(true); }} />
          <NotebookToggle onClick={() => { setMethodologyOpen(false); setNotebookOpen(true); }} />
        </div>
      )}
      {screen !== "boot" && examAttempt && !examAttempt.result && screen !== "examMode" && (
        <ExamHud endsAt={examAttempt.endsAt} onOpen={() => setScreen("examMode")} />
      )}
      <Notebook
        open={notebookOpen}
        notebook={notebook}
        onClose={() => setNotebookOpen(false)}
        onTextChange={setNotebookText}
        onClear={clearNotebook}
      />
      <Methodology open={methodologyOpen} onClose={() => setMethodologyOpen(false)} />
    </>
  );
}
