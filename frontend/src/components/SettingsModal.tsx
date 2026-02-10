import { useState, useEffect } from "react";
import { totpAPI, authAPI } from "../apis/api";
import { useAuth } from "../context/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import {
  Camera,
  Shield,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  Edit,
  Save,
  X,
  User,
  Mail,
  Phone,
  Info,
  Lock,
  UserX,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { BlockedUsersList } from "./BlockUserButton";

const SettingsModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const { user, refreshUser, updateUser } = useAuth();
  const [showTOTP, setShowTOTP] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [totpSecret, setTotpSecret] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpToken, setTotpToken] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(user?.totpEnabled || false);
  const [copied, setCopied] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    about: user?.about || "",
    email: user?.email || "",
    gender: user?.gender || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        about: user.about || "",
        email: user.email || "",
        gender: user.gender || "",
      });
      setTotpEnabled(user.totpEnabled || false);
    }
  }, [user]);

  const handleGenerateTOTP = async () => {
    try {
      const { data } = await totpAPI.generateTOTP();
      setTotpSecret(data.data);
      setQrCode(data.data.qrCode);
      setBackupCodes(data.data.backupCodes);
    } catch (error) {
      console.error("Failed to generate TOTP:", error);
      alert("Failed to generate TOTP");
    }
  };

  const handleEnableTOTP = async () => {
    if (!totpToken.trim()) {
      alert("Please enter TOTP token");
      return;
    }
    try {
      await totpAPI.enableTOTP(totpToken);
      setTotpEnabled(true);
      setShowTOTP(false);
      setTotpToken("");
      setQrCode("");
      setBackupCodes([]);
      alert("TOTP enabled successfully!");
    } catch (error: any) {
      console.error("Failed to enable TOTP:", error);
      alert(error.response?.data?.message || "Failed to enable TOTP");
    }
  };

  const handleDisableTOTP = async () => {
    if (!totpToken.trim()) {
      alert("Please enter TOTP token to disable");
      return;
    }
    try {
      await totpAPI.disableTOTP(totpToken);
      setTotpEnabled(false);
      setTotpToken("");
      alert("TOTP disabled successfully!");
    } catch (error: any) {
      console.error("Failed to disable TOTP:", error);
      alert(error.response?.data?.message || "Failed to disable TOTP");
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      console.log("Uploading user avatar:", file.name);
      const { data } = await authAPI.uploadAvatar(file);
      console.log("Avatar uploaded successfully:", data);
      const updatedUser = data?.data?.user ?? data?.user;
      if (updatedUser?.avatar != null && updateUser) {
        updateUser({ avatar: updatedUser.avatar });
      }
      if (refreshUser) {
        await refreshUser();
      }
      alert("Avatar updated successfully!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      alert(error.response?.data?.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const { data } = await authAPI.updateProfile({
        name: profileData.name,
        about: profileData.about,
        email: profileData.email || undefined,
        gender: profileData.gender || undefined,
      });
      setIsEditingProfile(false);
      const updatedUser = data?.data?.user ?? data?.user;
      if (updatedUser && updateUser) {
        updateUser(updatedUser);
      }
      if (refreshUser) {
        await refreshUser();
      }
      alert("Profile updated successfully!");
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      alert(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] bg-white border-2 border-gray-200 rounded-3xl shadow-2xl overflow-hidden">
          <DialogHeader className="border-b-2 border-gray-200 pb-4 bg-gray-50">
            <DialogTitle className="text-gray-800 flex items-center gap-3 text-xl font-bold">
              <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 max-h-[65vh] overflow-y-auto px-1 py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {/* Profile Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-800 font-bold flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-600" />
                  Profile Information
                </h3>
                {!isEditingProfile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingProfile(true)}
                    className="text-slate-600 rounded-xl"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>

              <div className="bg-gray-50 p-5 rounded-2xl border-2 border-gray-200">
                <div className="flex items-start gap-5">
                  {/* Avatar */}
                  <div className="relative group">
                    <Avatar className="h-24 w-24 ring-4 ring-slate-200 shadow-xl transition-all duration-300 group-hover:ring-slate-300">
                      <AvatarImage
                        src={
                          user?.avatar
                            ? `${user.avatar}${user.avatar.includes("?") ? "&" : "?"}t=${Date.now()}`
                            : undefined
                        }
                        key={user?.avatar}
                      />
                      <AvatarFallback className="bg-slate-600 text-white text-2xl font-bold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      className={`absolute bottom-0 right-0 bg-slate-700 rounded-full p-2.5 cursor-pointer hover:bg-slate-800 transition-all duration-300 shadow-lg hover:scale-110 ${uploadingAvatar ? "animate-pulse" : ""}`}
                    >
                      {uploadingAvatar ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4 text-white" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Profile Info / Edit Form */}
                  {isEditingProfile ? (
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="text-gray-600 text-xs font-bold mb-1.5 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Name
                        </label>
                        <Input
                          value={profileData.name}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              name: e.target.value,
                            })
                          }
                          className="bg-white border-2 border-gray-200 focus:border-slate-400 rounded-xl h-11"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="text-gray-600 text-xs font-bold mb-1.5 flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          About
                        </label>
                        <Input
                          value={profileData.about}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              about: e.target.value,
                            })
                          }
                          className="bg-white border-2 border-gray-200 focus:border-slate-400 rounded-xl h-11"
                          placeholder="Hey there!"
                        />
                      </div>
                      <div>
                        <label className="text-gray-600 text-xs font-bold mb-1.5 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </label>
                        <Input
                          type="email"
                          value={profileData.email}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              email: e.target.value,
                            })
                          }
                          className="bg-white border-2 border-gray-200 focus:border-slate-400 rounded-xl h-11"
                          placeholder="your@email.com"
                        />
                      </div>
                      <div>
                        <label className="text-gray-600 text-xs font-bold mb-1.5 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Gender
                        </label>
                        <select
                          value={profileData.gender}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              gender: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:border-slate-400 transition-all duration-300"
                        >
                          <option value="">Not specified</option>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={savingProfile}
                          className="flex-1 bg-slate-700 hover:bg-slate-800 rounded-xl h-11 font-bold shadow-lg"
                        >
                          {savingProfile ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                              <span>Saving...</span>
                            </div>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setIsEditingProfile(false);
                            setProfileData({
                              name: user?.name || "",
                              about: user?.about || "",
                              email: user?.email || "",
                              gender: user?.gender || "",
                            });
                          }}
                          className="hover:bg-red-50 hover:text-red-600 rounded-xl h-11"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-gray-800 font-bold text-lg">
                          {user?.name}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          {user?.about || "Hey there!"}
                        </p>
                      </div>
                      <div className="space-y-1.5 pt-2">
                        <p className="text-gray-600 text-xs flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-600" />
                          {user?.phone}
                        </p>
                        {user?.email && (
                          <p className="text-gray-600 text-xs flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-slate-600" />
                            {user.email}
                          </p>
                        )}
                        {user?.gender && (
                          <p className="text-gray-600 text-xs flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-slate-600" />
                            {user.gender === "MALE"
                              ? "Male"
                              : user.gender === "FEMALE"
                                ? "Female"
                                : "Other"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="space-y-4">
              <h3 className="text-gray-800 font-bold flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-600" />
                Security
              </h3>

              {/* TOTP */}
              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowTOTP(!showTOTP)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                        totpEnabled ? "bg-emerald-500" : "bg-gray-400"
                      }`}
                    >
                      {totpEnabled ? (
                        <ShieldCheck className="h-5 w-5 text-white" />
                      ) : (
                        <Shield className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-gray-800 font-bold text-sm">
                        Two-Factor Authentication
                      </p>
                      <p className="text-gray-600 text-xs">
                        {totpEnabled ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Enabled
                          </span>
                        ) : (
                          "Add extra security to your account"
                        )}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 text-gray-600 transition-transform duration-300 ${showTOTP ? "rotate-90" : ""}`}
                  />
                </div>

                {showTOTP && (
                  <div className="mt-4 pt-4 border-t-2 border-blue-200 space-y-4 animate-in slide-in-from-top duration-300">
                    {!totpEnabled ? (
                      <>
                        {!qrCode ? (
                          <Button
                            onClick={handleGenerateTOTP}
                            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl h-11 font-bold shadow-lg"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate QR Code
                          </Button>
                        ) : (
                          <>
                            <div className="text-center bg-white p-4 rounded-xl border-2 border-blue-200">
                              <p className="text-gray-800 text-sm font-semibold mb-3">
                                Scan with your authenticator app
                              </p>
                              <img
                                src={qrCode}
                                alt="QR Code"
                                className="mx-auto rounded-xl shadow-lg"
                              />
                            </div>
                            <div className="space-y-3">
                              <Input
                                placeholder="Enter 6-digit TOTP token"
                                value={totpToken}
                                onChange={(e) => setTotpToken(e.target.value)}
                                className="bg-white border-2 border-blue-200 focus:border-blue-500 rounded-xl h-11 text-center font-mono text-lg tracking-widest"
                                maxLength={6}
                              />
                              <Button
                                onClick={handleEnableTOTP}
                                className="w-full bg-slate-700 hover:bg-slate-800 rounded-xl h-11 font-bold"
                              >
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Enable TOTP
                              </Button>
                            </div>
                            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-yellow-800 text-xs font-bold flex items-center gap-1">
                                  ⚠️ Backup Codes (Save these!)
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={copyBackupCodes}
                                  className="text-yellow-700 hover:bg-yellow-100 rounded-lg h-8"
                                >
                                  {copied ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <div className="bg-white p-3 rounded-lg border border-yellow-200 grid grid-cols-2 gap-2">
                                {backupCodes.map((code, i) => (
                                  <p
                                    key={i}
                                    className="text-xs font-mono text-yellow-900"
                                  >
                                    {code}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          placeholder="Enter TOTP token to disable"
                          value={totpToken}
                          onChange={(e) => setTotpToken(e.target.value)}
                          className="bg-white border-2 border-red-200 focus:border-red-500 rounded-xl h-11 text-center font-mono text-lg tracking-widest"
                          maxLength={6}
                        />
                        <Button
                          variant="destructive"
                          onClick={handleDisableTOTP}
                          className="w-full bg-red-600 hover:bg-red-700 rounded-xl h-11 font-bold"
                        >
                          <ShieldOff className="h-4 w-4 mr-2" />
                          Disable Two-Factor Auth
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Blocked Users */}
              <div
                className="bg-red-50 p-4 rounded-2xl border-2 border-red-200 cursor-pointer hover:border-red-300 transition-all duration-300"
                onClick={() => setShowBlocked(true)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                      <UserX className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-gray-800 font-bold text-sm">
                        Blocked Users
                      </p>
                      <p className="text-gray-600 text-xs">
                        Manage blocked contacts
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BlockedUsersList
        open={showBlocked}
        onClose={() => setShowBlocked(false)}
      />
    </>
  );
};

export default SettingsModal;
