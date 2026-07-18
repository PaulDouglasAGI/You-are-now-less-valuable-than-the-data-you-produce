"use client";

import { useMemo, useState } from "react";
import type { Difficulty, NodeRunState, SaveData } from "@/lib/game/types";
import { chains } from "@/lib/game/chains";
import { loadSave, saveProgress, resetSave } from "@/lib/game/storage";
import type { NodeStatus } from "./UsMap";

import BootSequence from "./BootSequence";
import MainMenu from "./MainMenu";
import ChainBriefing from "./ChainBriefing";
import OperationMap from "./OperationMap";
import NodeBriefing from "./NodeBriefing";
import Terminal from "./Terminal";
import NodeComplete from "./NodeComplete";
import ChainComplete from "./ChainComplete";

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

  if (screen === "boot") {
    return <BootSequence onDone={() => setScreen("menu")} />;
  }

  if (screen === "menu") {
    return <MainMenu progressFor={progressFor} onSelect={handleSelectDifficulty} onReset={handleReset} />;
  }

  if (!chain) return null;

  if (screen === "briefing") {
    return <ChainBriefing chain={chain} onBegin={handleBegin} onBack={handleBackToMenu} />;
  }

  if (screen === "map") {
    return (
      <OperationMap chain={chain} statusFor={statusFor} onSelectNode={handleSelectNode} onBack={handleBackToMenu} />
    );
  }

  if (screen === "nodeBriefing" && activeNode) {
    return (
      <NodeBriefing
        node={activeNode}
        secured={securedIds.includes(activeNode.id)}
        onConnect={() => setScreen("terminal")}
        onBack={() => setScreen("map")}
      />
    );
  }

  if (screen === "terminal" && activeNode) {
    return (
      <Terminal
        node={activeNode}
        carryFlags={chainFlags}
        onSecured={handleSecured}
        onExit={() => setScreen("map")}
      />
    );
  }

  if (screen === "nodeComplete" && activeNode) {
    const isLastNode = chain.nodes[chain.nodes.length - 1].id === activeNode.id;
    return <NodeComplete node={activeNode} isLastNode={isLastNode} onContinue={handleNodeCompleteContinue} />;
  }

  if (screen === "chainComplete") {
    return <ChainComplete chain={chain} onMenu={handleBackToMenu} />;
  }

  return null;
}
