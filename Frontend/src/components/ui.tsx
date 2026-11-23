import { useEffect, type ReactNode } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { formatNum, type Dict, type Language } from '../i18n';

/** Responsive dialog: centered card on tablet/desktop, bottom sheet on phones. */
export function Modal(props: { title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean; closeLabel?: string }) {
  const { onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${props.wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={props.title}>
        <div className="modal-head">
          <div>
            <h3>{props.title}</h3>
            {props.subtitle && <p>{props.subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={props.closeLabel || 'Close'}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{props.children}</div>
      </div>
    </div>
  );
}

export function Field(props: { label: ReactNode; htmlFor?: string; hint?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label-row">
        <label className="field-label" htmlFor={props.htmlFor}>{props.label}</label>
        {props.aside}
      </div>
      {props.children}
      {props.hint && <p className="field-hint">{props.hint}</p>}
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="spin" />;
}

export function EmptyState(props: { icon: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{props.icon}</div>
      <h3>{props.title}</h3>
      {props.text && <p>{props.text}</p>}
      {props.children && <div className="empty-actions">{props.children}</div>}
    </div>
  );
}

export function PasswordInput(props: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  placeholder: string;
  autoComplete: string;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div className="password-input-wrapper">
      <input
        id={props.id}
        className="input"
        type={props.visible ? 'text' : 'password'}
        required
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={props.onToggle}
        aria-label={props.visible ? props.hideLabel : props.showLabel}
        title={props.visible ? props.hideLabel : props.showLabel}
      >
        {props.visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

/** 6-digit code input (numeric keyboard on phones, autofill from SMS/email on iOS). */
export function CodeInput(props: { id: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      id={props.id}
      className="input otp-input"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="••••••"
      autoFocus={props.autoFocus}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
    />
  );
}

export function ResendRow(props: { resendIn: number; lang: Language; t: Dict; onResend: () => void }) {
  return (
    <p className="auth-resend">
      {props.resendIn > 0 ? (
        <span>{props.t.resendIn.replace('{s}', formatNum(props.resendIn, props.lang, 0))}</span>
      ) : (
        <button type="button" className="link-btn" onClick={props.onResend}>
          {props.t.resendCode}
        </button>
      )}
    </p>
  );
}

export function Alert(props: { type: 'error' | 'success'; children: ReactNode }) {
  return (
    <div className={`auth-alert auth-alert-${props.type}`} role={props.type === 'error' ? 'alert' : 'status'}>
      {props.children}
    </div>
  );
}
