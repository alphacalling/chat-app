import { useState } from "react";
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

interface TOTPVerificationModalProps {
  open: boolean;
  onClose: () => void;
  onVerify: (totpToken: string) => Promise<void>;
  userName?: string;
}

const TOTPVerificationModal = ({
  open,
  onClose,
  onVerify,
  userName,
}: TOTPVerificationModalProps) => {
  const [totpToken, setTotpToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm animate-in slide-in-from-left duration-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Code Input */}
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
              disabled={loading}
            />
            <p className="text-gray-600 text-xs text-center">
              Open your authenticator app (Google Authenticator, Authy, etc.)
              and enter the code
            </p>
          </div>

          {/* Visual Indicator */}
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
              disabled={loading || totpToken.length !== 6}
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
              disabled={loading}
              className="flex-1 hover:bg-gray-100 rounded-xl h-12 font-semibold"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TOTPVerificationModal;
