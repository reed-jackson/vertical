"use client"

import * as React from "react"
import { AGENT_TOOLS } from "@/lib/agent/tools"

export type AgentStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error"
export type AgentMessage = { role: "user" | "agent"; text: string }
export type AgentCaption = { role: "user" | "agent"; text: string }

type ToolHandler = (name: string, args: Record<string, unknown>) => Promise<unknown>

export function useRealtimeAgent(options: { onTool: ToolHandler; context: string }) {
  const { onTool, context } = options
  const [status, setStatus] = React.useState<AgentStatus>("idle")
  const [error, setError] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<AgentMessage[]>([])
  const [caption, setCaption] = React.useState<AgentCaption | null>(null)
  const pcRef = React.useRef<RTCPeerConnection | null>(null)
  const dcRef = React.useRef<RTCDataChannel | null>(null)
  const localStreamRef = React.useRef<MediaStream | null>(null)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const generationRef = React.useRef(0)
  const onToolRef = React.useRef(onTool)
  const contextRef = React.useRef(context)
  onToolRef.current = onTool
  contextRef.current = context

  const stop = React.useCallback(() => {
    generationRef.current += 1
    dcRef.current?.close()
    pcRef.current?.close()
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    dcRef.current = null
    pcRef.current = null
    localStreamRef.current = null
    handledCalls.clear()
    if (audioRef.current) {
      audioRef.current.srcObject = null
    }
    setStatus("idle")
    setCaption(null)
  }, [])

  const start = React.useCallback(async () => {
    const generation = generationRef.current + 1
    generationRef.current = generation
    setMessages([])
    setCaption(null)
    setError(null)
    setStatus("connecting")

    try {
      const mic = await requestMicrophone()
      if (generation !== generationRef.current) {
        mic.getTracks().forEach((track) => track.stop())
        return
      }
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      localStreamRef.current = mic

      const sessionResponse = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      })
      const session = await sessionResponse.json()
      if (!sessionResponse.ok) throw new Error(session.error || "Unable to mint a Realtime key.")
      if (generation !== generationRef.current) return

      dcRef.current?.close()
      pcRef.current?.close()
      const pc = new RTCPeerConnection()
      pcRef.current = pc
      const audio = audioRef.current || new Audio()
      audio.autoplay = true
      audioRef.current = audio
      pc.ontrack = (event) => {
        audio.srcObject = event.streams[0]
        void audio.play().catch(() => undefined)
      }
      mic.getTracks().forEach((track) => pc.addTrack(track, mic))

      const dc = pc.createDataChannel("oai-events")
      dcRef.current = dc
      dc.addEventListener("open", () => {
        sendEvent(dc, {
          type: "session.update",
          session: {
            type: "realtime",
            tools: AGENT_TOOLS,
            tool_choice: "auto",
          },
        })
        sendEvent(dc, {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "system",
            content: [{ type: "input_text", text: `Current calendar context:\n${contextRef.current}` }],
          },
        })
        setStatus("listening")
      })
      dc.addEventListener("message", (event) => {
        void handleServerEvent(JSON.parse(event.data), {
          channel: dc,
          onTool: (name, args) => onToolRef.current(name, args),
          setStatus,
          appendMessage: (message) => setMessages((current) => [...current, message]),
          setCaption,
        })
      })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await waitForIceGathering(pc)
      if (generation !== generationRef.current) return
      const sdp = await exchangeSdp(session.clientSecret, pc.localDescription?.sdp || offer.sdp || "")
      if (generation !== generationRef.current) return
      await pc.setRemoteDescription({ type: "answer", sdp })
      await waitForDataChannel(dc)
      if (generation !== generationRef.current) return
      if (dc.readyState !== "open") {
        throw new Error("OpenAI Realtime connected, but the event channel did not open.")
      }
    } catch (caught) {
      if (generation !== generationRef.current) return
      setError(caught instanceof Error ? caught.message : "Unable to connect the agent.")
      setStatus("error")
    }
  }, [])

  const sendText = React.useCallback((text: string) => {
    const channel = dcRef.current
    if (!channel || channel.readyState !== "open") {
      setError("The agent is not connected yet.")
      return
    }
    setMessages((current) => [...current, { role: "user", text }])
    setCaption({ role: "user", text })
    sendEvent(channel, {
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
    })
    sendEvent(channel, { type: "response.create" })
    setStatus("thinking")
  }, [])

  return { status, error, messages, caption, sendText, audioRef, start, stop }
}

function sendEvent(channel: RTCDataChannel, payload: unknown) {
  channel.send(JSON.stringify(payload))
}

async function requestMicrophone() {
  if (!window.isSecureContext) {
    throw new Error("Open this app at http://localhost:5173 in Chrome or Safari. The microphone needs a secure browser origin.")
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This preview cannot use the microphone. Open http://localhost:5173 in Chrome or Safari.")
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (caught) {
    const name = caught instanceof DOMException ? caught.name : ""
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      throw new Error("Arc blocked the microphone. Click the lock icon next to localhost, set Microphone to Allow, then tap the mic again.")
    }
    if (name === "NotFoundError") {
      throw new Error("No microphone is available on this computer.")
    }
    throw new Error("Unable to start the microphone. Open http://localhost:5173 in Chrome or Safari, not the in-editor preview.")
  }
}

async function exchangeSdp(clientSecret: string, offer: string) {
  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    body: offer,
    headers: { Authorization: `Bearer ${clientSecret}`, "Content-Type": "application/sdp" },
  })
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 280)
    throw new Error(detail || "OpenAI Realtime did not accept the WebRTC offer.")
  }
  return response.text()
}

function waitForIceGathering(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return Promise.resolve()
  return new Promise<void>((resolve) => {
    const finish = () => {
      pc.removeEventListener("icegatheringstatechange", onChange)
      resolve()
    }
    const onChange = () => {
      if (pc.iceGatheringState === "complete") finish()
    }
    pc.addEventListener("icegatheringstatechange", onChange)
    window.setTimeout(finish, 5000)
  })
}

function waitForDataChannel(channel: RTCDataChannel) {
  if (channel.readyState === "open") return Promise.resolve()
  return new Promise<void>((resolve) => {
    const finish = () => {
      channel.removeEventListener("open", finish)
      resolve()
    }
    channel.addEventListener("open", finish)
    window.setTimeout(finish, 8000)
  })
}

async function handleServerEvent(
  event: { type?: string; transcript?: string; delta?: string; name?: string; arguments?: string; call_id?: string; response?: { output?: Array<{ type?: string; name?: string; arguments?: string; call_id?: string }> } },
  options: {
    channel: RTCDataChannel
    onTool: ToolHandler
    setStatus: (status: AgentStatus) => void
    appendMessage: (message: AgentMessage) => void
    setCaption: React.Dispatch<React.SetStateAction<AgentCaption | null>>
  },
) {
  if (event.type === "input_audio_buffer.speech_started") {
    options.setStatus("listening")
    options.setCaption({ role: "user", text: "" })
  }
  if (event.type === "response.created") options.setStatus("thinking")
  if (event.type === "output_audio_buffer.started" || event.type === "response.output_audio.delta") options.setStatus("speaking")
  if (event.type === "response.done") options.setStatus("listening")

  if (event.type === "conversation.item.input_audio_transcription.delta" && event.delta) {
    options.setCaption((current) => current?.role === "agent" ? current : { role: "user", text: `${current?.role === "user" ? current.text : ""}${event.delta}` })
  }
  if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
    const text = event.transcript.trim()
    options.appendMessage({ role: "user", text })
    options.setCaption((current) => current?.role === "agent" ? current : { role: "user", text })
  }
  if ((event.type === "response.output_audio_transcript.delta" || event.type === "response.audio_transcript.delta") && event.delta) {
    options.setCaption((current) => ({ role: "agent", text: `${current?.role === "agent" ? current.text : ""}${event.delta}` }))
  }
  if ((event.type === "response.output_audio_transcript.done" || event.type === "response.audio_transcript.done") && event.transcript) {
    const text = event.transcript.trim()
    options.appendMessage({ role: "agent", text })
    options.setCaption({ role: "agent", text })
  }

  if (event.type === "response.function_call_arguments.done" && event.name && event.call_id) {
    await runToolCall(event.name, event.arguments || "{}", event.call_id, options)
    return
  }

  const calls = event.type === "response.done" ? event.response?.output?.filter((item) => item.type === "function_call") : []
  for (const call of calls || []) {
    if (call.name && call.call_id) await runToolCall(call.name, call.arguments || "{}", call.call_id, options)
  }
}

const handledCalls = new Set<string>()

async function runToolCall(
  name: string,
  rawArgs: string,
  callId: string,
  options: { channel: RTCDataChannel; onTool: ToolHandler; setStatus: (status: AgentStatus) => void },
) {
  if (handledCalls.has(callId)) return
  handledCalls.add(callId)
  options.setStatus("thinking")
  let result: unknown
  try {
    const args = rawArgs ? JSON.parse(rawArgs) as Record<string, unknown> : {}
    result = await options.onTool(name, args)
  } catch (caught) {
    result = { error: caught instanceof Error ? caught.message : "Tool failed." }
  }
  sendEvent(options.channel, {
    type: "conversation.item.create",
    item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) },
  })
  sendEvent(options.channel, { type: "response.create" })
}
