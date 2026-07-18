"use client";

import { useEffect, useMemo, useState } from "react";
import type { Difficulty, NodeRunState, NotebookEntry, SaveData } from "@/lib/game/types";
import { chains } from "@/lib/game/chains";
import { loadSave, saveProgress, resetSave, loadNotebook, saveNotebook } from "@/lib/game/storage";
import type { NodeStatus } from "./UsMap";

import BootSequence from "./BootSequence";
import MainMenu from "./MainMenu";
import ChainBriefing from "./ChainBriefing";
import OperationMap from "./OperationMap";
import NodeBriefing from "./NodeBriefing";
import Terminal from "./Terminal";
import NodeComplete from "./NodeComplete";
import ChainComplete from "./ChainComplete";
import Notebook from "./Notebook";
import NotebookToggle from "./NotebookToggle";

type Screen = "boot" | "menu" | "briefing" | "map" | "nodeBriefing" | "terminal" | "nodeComplete" | "chainComplete";

export default function Game() {
  const [screen, setScreen] = useState<Screen>("boot");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  // safe as a lazy initializer: the save-dependent UI (MainMenu) only ever renders after
  // the boot screen, well past hydration, so there's no server/client mismatch to worry about
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [chainFlags, setChainFlags] = useState<string[]>([]);
  const [chainJustCompleted, setChainJustCompleted] = useState(false);

  const [notebook, setNotebook] = useState(() => loadNotebook());
  const [notebookOpen, setNotebookOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setNotebookOpen((open) => !open);
      } else if (e.key === "Escape") {
        setNotebookOpen(false);
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

  const chain = difficulty ? chains[difficulty] : null;
  const activeNode = useMemo(
    () => chain?.nodes.find((n) => n.id === activeNodeId) ?? null,
    [chain, activeNodeId],
  );
  const securedIds = (difficulty && save[difficulty]?.securedNodeIds) || [];

  function statusFor(nodeId: string): NodeStatus {
    if (!chain) return "locked";
    if (securedIds.includes(nodeId)) return "secured";
    const idx = chain.nodes.findIndex((n) => n.id === nodeId);
    const priorSecured = chain.nodes.slice(0, idx).every((n) => securedIds.includes(n.id));
    return priorSecured ? "unlocked" : "locked";
  }

  function progressFor(d: Difficulty) {
    return { secured: save[d]?.securedNodeIds.length ?? 0, total: chains[d].nodes.length };
  }

  function handleSelectDifficulty(d: Difficulty) {
    setDifficulty(d);
    setScreen("briefing");
  }

  function handleBegin() {
    if (!difficulty) return;
    setChainFlags(save[difficulty]?.flags ?? []);
    setScreen("map");
  }

  function handleSelectNode(nodeId: string) {
    setActiveNodeId(nodeId);
    setScreen("nodeBriefing");
  }

  function handleSecured(finalState: NodeRunState) {
    if (!difficulty || !chain || !activeNodeId) return;
    const mergedFlags = Array.from(new Set([...chainFlags, ...finalState.discoveredFlags]));
    const newSecured = Array.from(new Set([...(save[difficulty]?.securedNodeIds ?? []), activeNodeId]));
    const isLast = newSecured.length === chain.nodes.length;

    saveProgress(difficulty, newSecured, mergedFlags, isLast ? Date.now() : undefined);
    setSave((prev) => ({ ...prev, [difficulty]: { securedNodeIds: newSecured, flags: mergedFlags, completedAt: isLast ? Date.now() : undefined } }));
    setChainFlags(mergedFlags);
    setChainJustCompleted(isLast);
    setScreen("nodeComplete");
  }

  function handleNodeCompleteContinue() {
    setScreen(chainJustCompleted ? "chainComplete" : "map");
  }

  function handleBackToMenu() {
    setDifficulty(null);
    setActiveNodeId(null);
    setScreen("menu");
  }

  function handleReset() {
    resetSave();
    setSave({});
  }

  let content: React.ReactNode = null;

  if (screen === "boot") {
    content = <BootSequence onDone={() => setScreen("menu")} />;
  } else if (screen === "menu") {
    content = <MainMenu progressFor={progressFor} onSelect={handleSelectDifficulty} onReset={handleReset} />;
  } else if (!chain) {
    content = null;
  } else if (screen === "briefing") {
    content = <ChainBriefing chain={chain} onBegin={handleBegin} onBack={handleBackToMenu} />;
  } else if (screen === "map") {
    content = <OperationMap chain={chain} statusFor={statusFor} onSelectNode={handleSelectNode} onBack={handleBackToMenu} />;
  } else if (screen === "nodeBriefing" && activeNode) {
    content = (
      <NodeBriefing
        node={activeNode}
        secured={securedIds.includes(activeNode.id)}
        onConnect={() => setScreen("terminal")}
        onBack={() => setScreen("map")}
      />
    );
  } else if (screen === "terminal" && activeNode) {
    content = (
      <Terminal
        node={activeNode}
        carryFlags={chainFlags}
        onSecured={handleSecured}
        onExit={() => setScreen("map")}
        onNote={addNote}
      />
    );
  } else if (screen === "nodeComplete" && activeNode) {
    const isLastNode = chain.nodes[chain.nodes.length - 1].id === activeNode.id;
    content = <NodeComplete node={activeNode} isLastNode={isLastNode} onContinue={handleNodeCompleteContinue} />;
  } else if (screen === "chainComplete") {
    content = <ChainComplete chain={chain} onMenu={handleBackToMenu} />;
  }

  return (
    <>
      {content}
      {screen !== "boot" && <NotebookToggle onClick={() => setNotebookOpen(true)} />}
      <Notebook
        open={notebookOpen}
        notebook={notebook}
        onClose={() => setNotebookOpen(false)}
        onTextChange={setNotebookText}
        onClear={clearNotebook}
      />
    </>
  );
}
