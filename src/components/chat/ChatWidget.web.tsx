import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/supabase';
import {
  CHAT_MESSAGE_LIMIT,
  ChatError,
  chatErrorMessage,
  requestChatReply,
  type ChatMessage,
} from '../../lib/chat';
import { SproutMark, Arrow, Sparkle } from '../marketing/Illustrations.web';
import '../../design/web-tokens.css';
import './chat.css';

const starters = [
  {
    label: 'A little play',
    message: 'Help me think of a simple play idea for my child.',
    icon: 'play',
  },
  {
    label: 'The everyday magic',
    message: 'How can I make everyday moments with my child more meaningful?',
    icon: 'heart',
  },
  {
    label: 'Our family story',
    message: 'What are some little memories I could capture in our family journal?',
    icon: 'book',
  },
] as const;

function ChatIcon({
  name,
}: {
  name: 'chat' | 'close' | 'send' | 'plus' | 'stop' | 'play' | 'heart' | 'book';
}) {
  const paths = {
    chat: 'M20 11.5a8 8 0 0 1-8 8H5l-3 2v-10a9 9 0 0 1 18 0ZM7 9h8M7 13h5',
    close: 'm6 6 12 12M6 18 18 6',
    send: 'M12 19V5m-6 6 6-6 6 6',
    plus: 'M12 5v14M5 12h14',
    stop: 'M6 6h12v12H6Z',
    play: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9Z',
    heart:
      'M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
    book: 'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

/** Unmounting (or changing accounts) discards every message and aborts any reply. */
export default function ChatWidget() {
  const { session, loading } = useAuth();
  if (loading || !session) return null;
  return <SignedInChat key={session.user.id} userId={session.user.id} />;
}

function SignedInChat({ userId }: { userId: string }) {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [unread, setUnread] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const isOpen = useRef(open);
  isOpen.current = open;

  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );

  useEffect(() => {
    const node = dialog.current;
    if (!node || !open) return;
    node.showModal();
    setUnread(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Keep the mobile keyboard closed until the parent chooses to type.
    if (window.matchMedia('(min-width: 601px)').matches) input.current?.focus();
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
      launcher.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 12_000);
    return () => clearTimeout(timer);
  }, [pending]);

  useEffect(() => {
    if (open && scroll.current) {
      scroll.current.scrollTop = messages.length ? scroll.current.scrollHeight : 0;
    }
  }, [open, messages, pending, error, slow]);

  useEffect(() => {
    if (!input.current) return;
    input.current.style.height = 'auto';
    input.current.style.height = `${Math.min(input.current.scrollHeight, 120)}px`;
  }, [draft, open]);

  async function send(content: string, retry = false) {
    const text = content.trim();
    if (!text || text.length > CHAT_MESSAGE_LIMIT || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const next: ChatMessage[] = retry
      ? messages
      : [...messages, { id: crypto.randomUUID(), role: 'user', content: text }];
    setMessages(next);
    if (!retry) setDraft('');
    setError(null);
    setPending(true);
    setConfirmReset(false);
    try {
      // Ask Auth for the latest refreshed session rather than reusing an old token.
      const { data, error: authError } = await db().auth.getSession();
      if (authError || !data.session || data.session.user.id !== userId)
        throw new ChatError('unauthorized');
      if (controller.signal.aborted) throw new ChatError('cancelled');
      const reply = await requestChatReply({
        messages: next,
        accessToken: data.session.access_token,
        signal: controller.signal,
      });
      if (request.current !== controller) return;
      setMessages([...next, { id: crypto.randomUUID(), role: 'assistant', content: reply }]);
      if (!isOpen.current) setUnread(true);
    } catch (failure) {
      if (request.current === controller) setError(failure);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }

  function reset() {
    request.current?.abort();
    request.current = null;
    setMessages([]);
    setDraft('');
    setPending(false);
    setError(null);
    setConfirmReset(false);
    setUnread(false);
    input.current?.focus();
  }

  const unauthorized = error instanceof ChatError && error.code === 'unauthorized';
  const lastMessage = messages.at(-1);
  return (
    <div className="parvarish-chat">
      <button
        ref={launcher}
        className="pc-launcher"
        aria-label={unread ? 'Open Ask Parvarish, new reply' : 'Open Ask Parvarish'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="parvarish-chat"
        onClick={() => setOpen(true)}
      >
        <span className="pc-launcher-mark">
          <ChatIcon name="chat" />
        </span>
        <span>
          Ask Parvarish<span className="pc-launcher-caption">A little help as you grow</span>
        </span>
        {unread && <span className="pc-unread" aria-hidden="true" />}
      </button>
      <dialog
        ref={dialog}
        id="parvarish-chat"
        className="pc-dialog"
        aria-labelledby="pc-title"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      >
        <div className="pc-panel">
          <header className="pc-header">
            <span className="pc-avatar">
              <SproutMark />
            </span>
            <div className="pc-heading">
              <h2 id="pc-title">
                Ask Parvarish<span>.</span>
              </h2>
              <p>A little company for the journey</p>
            </div>
            <button
              type="button"
              className="pc-icon-button"
              aria-label="Start a new chat"
              title="Start a new chat"
              disabled={!messages.length && !draft}
              onClick={() => setConfirmReset(true)}
            >
              <ChatIcon name="plus" />
            </button>
            <button
              type="button"
              className="pc-icon-button"
              aria-label="Close chat"
              title="Close chat"
              onClick={() => setOpen(false)}
            >
              <ChatIcon name="close" />
            </button>
          </header>

          {confirmReset ? (
            <div className="pc-reset" role="group" aria-label="Confirm new chat">
              <p>Make room for a new conversation?</p>
              <span>This will clear the messages in this chat.</span>
              <div>
                <button onClick={reset}>Start fresh</button>
                <button onClick={() => setConfirmReset(false)}>Keep chatting</button>
              </div>
            </div>
          ) : null}

          <div className="pc-scroll" ref={scroll}>
            {messages.length === 0 ? (
              <div className="pc-welcome">
                <div className="pc-welcome-art" aria-hidden="true">
                  <span className="pc-orbit" />
                  <span className="pc-sprout">
                    <SproutMark />
                  </span>
                  <Sparkle className="pc-spark" />
                  <span className="pc-art-note">a little space for you</span>
                </div>
                <span className="pc-eyebrow">GROWING UP, TOGETHER</span>
                <h3>
                  Small questions.
                  <br />
                  <em>A little support.</em>
                </h3>
                <p>
                  Parenting is full of little wonderings.
                  <br />
                  What’s on your mind today?
                </p>
                <div className="pc-starters">
                  <span className="pc-starters-label">A few places to begin</span>
                  {starters.map((starter) => (
                    <button key={starter.icon} onClick={() => void send(starter.message)}>
                      <span className={`pc-starter-icon pc-starter-${starter.icon}`}>
                        <ChatIcon name={starter.icon} />
                      </span>
                      <span>
                        <strong>{starter.label}</strong>
                        <span>{starter.message}</span>
                      </span>
                      <Arrow />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <p className="pc-conversation-note">A little space to think out loud</p>
                <div
                  className="pc-messages"
                  role="log"
                  aria-label="Conversation"
                  aria-live="polite"
                  aria-relevant="additions"
                  aria-busy={pending}
                >
                  {messages.map((message) => (
                    <div className={`pc-message pc-message-${message.role}`} key={message.id}>
                      <span className="pc-message-author">
                        {message.role === 'user' ? 'You' : 'Parvarish'}
                      </span>
                      <div className="pc-bubble">{message.content}</div>
                    </div>
                  ))}
                </div>
                {pending && (
                  <div className="pc-waiting" role="status">
                    <span className="pc-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      {slow ? 'Taking a little longer. We’re still here…' : 'Thinking with you…'}
                    </span>
                  </div>
                )}
                {error != null && (
                  <div className="pc-error" role="alert">
                    <p>{chatErrorMessage(error)}</p>
                    {unauthorized ? (
                      <button
                        onClick={async () => {
                          try {
                            await signOut();
                            router.replace('/sign-in');
                          } catch {
                            setError(new ChatError('network'));
                          }
                        }}
                      >
                        Sign in again <span aria-hidden="true">→</span>
                      </button>
                    ) : (
                      <button onClick={() => lastMessage && void send(lastMessage.content, true)}>
                        Try again <span aria-hidden="true">↻</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDraft(lastMessage?.content ?? '');
                        setMessages(messages.slice(0, -1));
                        setError(null);
                        requestAnimationFrame(() => input.current?.focus());
                      }}
                    >
                      Edit message
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <footer className="pc-footer">
            <form
              className="pc-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              <label className="pc-sr-only" htmlFor="pc-message">
                Your message
              </label>
              <textarea
                ref={input}
                id="pc-message"
                value={draft}
                rows={1}
                maxLength={CHAT_MESSAGE_LIMIT}
                placeholder="What’s on your mind?"
                disabled={error != null}
                aria-describedby="pc-composer-hint"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing &&
                    window.matchMedia('(min-width: 601px)').matches
                  ) {
                    event.preventDefault();
                    if (!pending && error == null) void send(draft);
                  }
                }}
              />
              {pending ? (
                <button
                  type="button"
                  className="pc-send"
                  aria-label="Stop reply"
                  title="Stop reply"
                  onClick={() => request.current?.abort()}
                >
                  <ChatIcon name="stop" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="pc-send"
                  aria-label="Send message"
                  title="Send message"
                  disabled={!draft.trim() || error != null}
                >
                  <ChatIcon name="send" />
                </button>
              )}
            </form>
            <div className="pc-composer-hint" id="pc-composer-hint">
              <span>
                {error != null
                  ? 'Retry or edit your message to continue.'
                  : pending
                    ? 'Take your time. You can stop the reply.'
                    : 'Your conversation stays here until you leave or refresh.'}
              </span>
              {draft.length >= 1800 && (
                <span>
                  {draft.length}/{CHAT_MESSAGE_LIMIT}
                </span>
              )}
            </div>
            <p className="pc-disclaimer">AI support for everyday parenting. Not medical advice.</p>
          </footer>
        </div>
      </dialog>
    </div>
  );
}
