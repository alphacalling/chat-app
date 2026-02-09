import { useState } from "react";
import { totpAPI } from "../apis/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Shield, Copy, Check, Sparkles, Lock, KeyRound, CheckCircle2 } from "lucide-react";

interface TOTPSetupModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const TOTPSetupModal = ({ open, onClose, onComplete }: TOTPSetupModalProps) => {
  const [step, setStep] = useState<"intro" | "qr" | "verify">("intro");
  const [totpSecret, setTotpSecret] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpToken, setTotpToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerateTOTP = async () => {
    try {
      setLoading(true);
      const { data } = await totpAPI.generateTOTP();
      setTotpSecret(data.data);
      setQrCode(data.data.qrCode);
      setBackupCodes(data.data.backupCodes);
      setStep("qr");
    } catch (error) {
      console.error("Failed to generate TOTP:", error);
      alert("Failed to generate TOTP");
    } finally {
      setLoading(false);
    }
  };

  const handleEnableTOTP = async () => {
    if (!totpToken.trim()) {
      alert("Please enter TOTP token");
      return;
    }
    try {
      setLoading(true);
      await totpAPI.enableTOTP(totpToken);
      setStep("verify");
      onComplete();
    } catch (error: any) {
      console.error("Failed to enable TOTP:", error);
      alert(error.response?.data?.message || "Failed to enable TOTP");
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSkip = () => {
    onClose();
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-2 border-whatsapp-border rounded-3xl shadow-2xl overflow-hidden">
        <DialogHeader className="border-b-2 border-whatsapp-border pb-4 bg-gradient-to-r from-whatsapp-green/5 to-green-50">
          <DialogTitle className="text-whatsapp-text flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 bg-gradient-to-br from-whatsapp-green to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            Enable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-whatsapp-secondary mt-2">
            Add an extra layer of security to your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {step === "intro" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Info Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border-2 border-blue-200">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-whatsapp-text font-bold mb-1">Why enable 2FA?</h4>
                    <p className="text-whatsapp-secondary text-sm leading-relaxed">
                      Two-factor authentication adds an extra layer of security. You'll need to enter a code from your authenticator app when logging in.
                    </p>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-3">
                {[
                  { icon: Shield, text: "Protect your account from unauthorized access" },
                  { icon: KeyRound, text: "Use any authenticator app (Google, Authy, etc.)" },
                  { icon: Lock, text: "Backup codes for emergency access" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-whatsapp-light/50 rounded-xl">
                    <div className="w-8 h-8 bg-whatsapp-green/20 rounded-lg flex items-center justify-center">
                      <item.icon className="h-4 w-4 text-whatsapp-green" />
                    </div>
                    <p className="text-whatsapp-text text-sm font-medium">{item.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={handleGenerateTOTP} 
                  disabled={loading} 
                  className="flex-1 bg-gradient-to-r from-whatsapp-green to-green-600 hover:from-green-600 hover:to-whatsapp-green rounded-xl h-12 font-bold shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Generating...</span>
                    </div>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Enable 2FA
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleSkip} 
                  className="flex-1 hover:bg-whatsapp-light rounded-xl h-12 font-semibold"
                >
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {step === "qr" && qrCode && (
            <div className="space-y-5 animate-in fade-in zoom-in duration-500">
              {/* QR Code */}
              <div className="text-center bg-gradient-to-br from-whatsapp-light/50 to-white p-5 rounded-2xl border-2 border-whatsapp-border">
                <p className="text-whatsapp-text font-semibold mb-4">
                  Scan this QR code with your authenticator app
                </p>
                <div className="bg-white p-4 rounded-2xl inline-block shadow-xl border-2 border-whatsapp-border">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
                <p className="text-whatsapp-secondary text-xs mt-4">
                  Use apps like Google Authenticator, Authy, or Microsoft Authenticator
                </p>
              </div>

              {/* Token Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-whatsapp-text flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-whatsapp-green" />
                  Enter the 6-digit code from your app
                </label>
                <Input
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="bg-whatsapp-light/50 border-2 border-whatsapp-border focus:border-whatsapp-green text-center text-3xl font-mono tracking-[0.5em] h-14 rounded-xl"
                  autoFocus
                />
              </div>

              {/* Backup Codes */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-2xl border-2 border-yellow-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                    ⚠️ Backup Codes (Save these!)
                  </label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyBackupCodes}
                    className="text-yellow-700 hover:bg-yellow-100 rounded-lg"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="bg-white p-3 rounded-xl border-2 border-yellow-200 grid grid-cols-2 gap-2 max-h-28 overflow-y-auto">
                  {backupCodes.map((code, i) => (
                    <p key={i} className="text-xs font-mono text-yellow-900 bg-yellow-50 px-2 py-1 rounded">{code}</p>
                  ))}
                </div>
                <p className="text-yellow-700 text-xs mt-2">
                  Save these codes in a safe place. Use them if you lose access to your authenticator app.
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleEnableTOTP} 
                  disabled={loading || totpToken.length !== 6} 
                  className="flex-1 bg-gradient-to-r from-whatsapp-green to-green-600 hover:from-green-600 hover:to-whatsapp-green rounded-xl h-12 font-bold shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verify & Enable
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleSkip} 
                  className="flex-1 hover:bg-whatsapp-light rounded-xl h-12 font-semibold"
                >
                  Skip
                </Button>
              </div>
            </div>
          )}

          {step === "verify" && (
            <div className="text-center space-y-5 animate-in fade-in zoom-in duration-500">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-whatsapp-text font-bold text-xl mb-2">
                  Two-Factor Authentication Enabled!
                </p>
                <p className="text-whatsapp-secondary text-sm leading-relaxed max-w-xs mx-auto">
                  Your account is now more secure. You'll need to enter a code from your authenticator app when logging in.
                </p>
              </div>
              <Button 
                onClick={onClose} 
                className="w-full bg-gradient-to-r from-whatsapp-green to-green-600 hover:from-green-600 hover:to-whatsapp-green rounded-xl h-12 font-bold shadow-lg"
              >
                Continue to Login
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TOTPSetupModal;