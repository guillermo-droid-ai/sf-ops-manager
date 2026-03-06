'use client';

import { useState, useCallback, useEffect } from 'react';
import { Mic, MicOff, X, Phone, PhoneOff, Loader2 } from 'lucide-react';
import { RetellWebClient } from 'retell-client-js-sdk';

const AGENT_ID = 'agent_f39c518c9eda0425c9097c34db';

type CallStatus = 'idle' | 'connecting' | 'active' | 'ending';

export default function VoiceWidget() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CallStatus>('idle');
  const [client, setClient] = useState<RetellWebClient | null>(null);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const retell = new RetellWebClient();

    retell.on('call_started', () => {
      setStatus('active');
      setTranscript([{ role: 'agent', text: 'Hey, Trinity Ops here. What do you want to know about the pipeline?' }]);
    });

    retell.on('call_ended', () => {
      setStatus('idle');
    });

    retell.on('error', (err) => {
      setError('Connection error. Please try again.');
      setStatus('idle');
      console.error('Retell error:', err);
    });

    retell.on('update', (update) => {
      if (update.transcript) {
        setTranscript(
          update.transcript.map((t: { role: string; content: string }) => ({
            role: t.role,
            text: t.content,
          }))
        );
      }
    });

    setClient(retell);
    return () => { retell.stopCall(); };
  }, []);

  const startCall = useCallback(async () => {
    if (!client) return;
    setError(null);
    setStatus('connecting');
    setTranscript([]);

    try {
      // Get access token from our backend
      const res = await fetch('/api/chat/token', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to get call token');
      const { access_token } = await res.json();

      await client.startCall({ accessToken: access_token });
    } catch (err) {
      setError('Failed to connect. Check your connection and try again.');
      setStatus('idle');
    }
  }, [client]);

  const endCall = useCallback(() => {
    if (!client) return;
    setStatus('ending');
    client.stopCall();
    setTimeout(() => setStatus('idle'), 500);
  }, [client]);

  const statusLabel = {
    idle: 'Ask anything about your pipeline',
    connecting: 'Connecting...',
    active: 'Listening...',
    ending: 'Ending call...',
  }[status];

  const statusColor = {
    idle: 'text-gray-400',
    connecting: 'text-yellow-400',
    active: 'text-green-400',
    ending: 'text-gray-400',
  }[status];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition hover:scale-105"
        title="Ask Trinity Ops"
      >
        <Mic className="h-6 w-6" />
      </button>

      {/* Widget panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div>
              <p className="text-sm font-semibold text-white">Trinity Ops</p>
              <p className={`text-xs ${statusColor}`}>{statusLabel}</p>
            </div>
            <button
              onClick={() => {
                endCall();
                setOpen(false);
              }}
              className="text-gray-500 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Transcript */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
            {transcript.length === 0 && status === 'idle' && (
              <div className="text-center text-gray-600 text-xs pt-6 space-y-2">
                <Mic className="h-8 w-8 mx-auto opacity-30" />
                <p>Hit the button below and ask anything.</p>
                <p className="text-gray-700">"Who has the most stale leads?"</p>
                <p className="text-gray-700">"Which deals are blocked?"</p>
                <p className="text-gray-700">"What's our pipeline value?"</p>
              </div>
            )}
            {transcript.map((t, i) => (
              <div
                key={i}
                className={`flex ${t.role === 'agent' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    t.role === 'agent'
                      ? 'bg-gray-800 text-gray-200'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {t.text}
                </div>
              </div>
            ))}
            {status === 'connecting' && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-xl px-3 py-2">
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2 bg-red-900/30 border-t border-red-800">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Call button */}
          <div className="p-4 border-t border-gray-800">
            {status === 'idle' || status === 'ending' ? (
              <button
                onClick={startCall}
                disabled={status === 'ending'}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition"
              >
                <Phone className="h-4 w-4" />
                Start Voice Session
              </button>
            ) : (
              <button
                onClick={endCall}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2.5 rounded-xl transition"
              >
                <PhoneOff className="h-4 w-4" />
                {status === 'connecting' ? 'Cancel' : 'End Session'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
