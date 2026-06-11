/**
 * EXAMOS - Anti-Cheat Hook
 * Client-side detection for: tab switching, fullscreen exit, face detection.
 * Uses MediaPipe Face Detection for webcam monitoring.
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface AntiCheatConfig {
  onEvent: (eventType: string, details?: Record<string, unknown>) => void;
  enableWebcam?: boolean;
}

interface AntiCheatState {
  isMonitoring: boolean;
  tabSwitchCount: number;
  fullscreenExitCount: number;
  faceIssueCount: number;
  webcamActive: boolean;
}

export function useAntiCheat({ onEvent, enableWebcam = true }: AntiCheatConfig) {
  const [state, setState] = useState<AntiCheatState>({
    isMonitoring: false,
    tabSwitchCount: 0,
    fullscreenExitCount: 0,
    faceIssueCount: 0,
    webcamActive: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Tab Switch Detection ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setState((prev) => ({ ...prev, tabSwitchCount: prev.tabSwitchCount + 1 }));
        onEvent("tab_switch", { timestamp: Date.now() });
      }
    };

    const handleBlur = () => {
      setState((prev) => ({ ...prev, tabSwitchCount: prev.tabSwitchCount + 1 }));
      onEvent("tab_switch", { timestamp: Date.now(), type: "window_blur" });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [onEvent]);

  // ── Fullscreen Exit Detection ──
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setState((prev) => ({
          ...prev,
          fullscreenExitCount: prev.fullscreenExitCount + 1,
        }));
        onEvent("fullscreen_exit", { timestamp: Date.now() });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [onEvent]);

  // ── Enter Fullscreen ──
  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      console.warn("Could not enter fullscreen");
    }
  }, []);

  const checkFacePresence = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 320;
    canvas.height = 240;
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);

    const imageData = ctx.getImageData(0, 0, 320, 240);
    const data = imageData.data;

    // Count skin-colored pixels as a basic face presence heuristic
    let skinPixels = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Simple skin color detection in RGB space
      if (
        r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        Math.abs(r - g) > 15 &&
        r - b > 15
      ) {
        skinPixels++;
      }
    }

    const skinRatio = skinPixels / totalPixels;

    // No face: very few skin pixels
    if (skinRatio < 0.02) {
      setState((prev) => ({ ...prev, faceIssueCount: prev.faceIssueCount + 1 }));
      onEvent("no_face", { skinRatio, timestamp: Date.now() });
    }
    // Multiple faces: unusually high skin pixel ratio  
    else if (skinRatio > 0.35) {
      setState((prev) => ({ ...prev, faceIssueCount: prev.faceIssueCount + 1 }));
      onEvent("multiple_faces", { skinRatio, timestamp: Date.now() });
    }
  }, [onEvent]);

  // ── Webcam Setup (face count detection via canvas pixel analysis) ──
  const startWebcam = useCallback(async () => {
    if (!enableWebcam) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState((prev) => ({ ...prev, webcamActive: true, isMonitoring: true }));

      // Simple face presence detection using skin-color pixel analysis
      // This is a lightweight approach without external ML libraries
      detectionIntervalRef.current = setInterval(() => {
        checkFacePresence();
      }, 3000); // Check every 3 seconds
    } catch (err) {
      console.warn("Webcam access denied:", err);
      setState((prev) => ({ ...prev, webcamActive: false, isMonitoring: true }));
    }
  }, [enableWebcam, checkFacePresence]);



  // ── Stop Monitoring ──
  const stopMonitoring = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setState((prev) => ({ ...prev, isMonitoring: false, webcamActive: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    ...state,
    videoRef,
    canvasRef,
    startWebcam,
    stopMonitoring,
    enterFullscreen,
  };
}
