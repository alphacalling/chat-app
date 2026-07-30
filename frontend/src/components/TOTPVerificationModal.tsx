import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Shield, Lock, KeyRound, AlertCircle } from "lucide-react";
import { authAPI, getErrorMessage } from "../apis/api";

const TOTP_RESET_TOKEN_KEY = "chitchat_totp_reset_token";

interface TOTPVerificationModalProps {
  open: boolean;
  onClose: () => void;
  onVerify: (totpToken: string) => Promise<void>;
  totpResetToken?: string | null;
  onRefreshResetToken?: () => Promise<string | null>;
  onResetSuccess?: (user: any) => void;
  userName?: string;
}

const TOTPVerificationModal = ({
  open,
  onClose,
  onVerify,
  totpResetToken,
  onRefreshResetToken,
  onResetSuccess,
  userName,
}: TOTPVerificationModalProps) => {
  const [totpToken, setTotpToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmReset(false);
      setError("");
      setTotpToken("");
    }
  }, [open]);

  const resolveResetToken = async (): Promise<string> => {
    let token =
      totpResetToken ||
      sessionStorage.getItem(TOTP_RESET_TOKEN_KEY) ||
      null;

    if (!token && onRefreshResetToken) {
      token = await onRefreshResetToken();
    }

    if (!token) {
      throw new Error("Session expired. Please close this dialog and sign in again.");
    }

    return token;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (totpToken.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    try {
      setLoading(true);
      await onVerify(totpToken);
      setTotpToken("");
    } catch (err: any) {
      setError(err.message || "Invalid TOTP code. Please try again.");
      setTotpToken("");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError("");
    try {
      setResetting(true);
      const token = await resolveResetToken();
      const res = await authAPI.resetTOTP({ totpResetToken: token });
      const userData = res.data?.data?.user;

      if (!userData) {
        throw new Error("Unexpected server response");
      }

      sessionStorage.removeItem(TOTP_RESET_TOKEN_KEY);
      setConfirmReset(false);
      setTotpToken("");
      onResetSuccess?.(userData);
    } catch (err: any) {
      setError(
        getErrorMessage(err, err.message || "Could not reset 2FA. Please try again."),
      );
    } finally {
      setResetting(false);
    }
  };

  const showResetOption = Boolean(onRefreshResetToken || totpResetToken);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="max-w-md bg-white border-2 border-gray-200 rounded-3xl shadow-2xl overflow-hidden">
        <DialogHeader className="border-b-2 border-gray-200 pb-4 bg-gray-50">
          <DialogTitle className="text-gray-800 flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            {userName
              ? `Enter the 6-digit code for ${userName}`
              : "Enter the 6-digit code from your authenticator app"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm animate-in slide-in-from-left duration-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-600" />
              6-Digit Code
            </label>
            <Input
              value={totpToken}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setTotpToken(value);
                setError("");
              }}
              placeholder="000000"
              maxLength={6}
              className="bg-gray-50 border-2 border-gray-200 focus:border-slate-400 text-center text-3xl font-mono tracking-[0.5em] h-16 rounded-xl"
              autoFocus
              disabled={loading || resetting}
            />
            <p className="text-gray-600 text-xs text-center">
              Open your authenticator app (Google Authenticator, Authy, etc.)
              and enter the code
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl font-mono transition-all duration-300 ${
                  totpToken[idx]
                    ? "bg-slate-700 text-white border-slate-700 shadow-lg"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}
              >
                {totpToken[idx] || "•"}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading || resetting || totpToken.length !== 6}
              className="flex-1 bg-slate-700 hover:bg-slate-800 rounded-xl h-12 font-bold shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  <span>Verifying...</span>
                </div>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Verify
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading || resetting}
              className="flex-1 hover:bg-gray-100 rounded-xl h-12 font-semibold"
            >
              Cancel
            </Button>
          </div>

          {showResetOption && (
            <div className="pt-3 border-t-2 border-gray-100">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmReset(true);
                    setError("");
                  }}
                  disabled={loading || resetting}
                  className="w-full text-center text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
                >
                  Lost access to your authenticator?
                </button>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 px-4 py-3 rounded-lg text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Resetting will turn off Two-Factor Authentication for your
                      account and sign you in. You can set it up again from
                      Settings afterwards.
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={handleReset}
                      disabled={resetting}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-11 font-bold shadow-lg disabled:opacity-50"
                    >
                      {resetting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          <span>Resetting...</span>
                        </div>
                      ) : (
                        "Reset 2FA & Sign In"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setConfirmReset(false)}
                      disabled={resetting}
                      className="flex-1 hover:bg-gray-100 rounded-xl h-11 font-semibold"
                    >
                      Keep 2FA
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { TOTP_RESET_TOKEN_KEY };
export default TOTPVerificationModal;
