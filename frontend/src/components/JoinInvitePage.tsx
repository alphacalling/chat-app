import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { inviteAPI } from "../apis/api";
import { useAuth } from "../context/useAuth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Users,
  ArrowLeft,
  Link as LinkIcon,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const JoinInvitePage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState(code || "");

  useEffect(() => {
    if (code && user) {
      handleJoin();
    }
  }, [code, user]);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await inviteAPI.joinViaInvite(inviteCode);
      navigate("/chat");
      window.location.reload();
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to join group");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center animate-in fade-in zoom-in duration-700">
          <div className="w-20 h-20 bg-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Users className="w-10 h-10 text-white" />
          </div>
          <p className="text-gray-800 font-bold text-xl mb-4">
            Please login to join a group
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="bg-slate-700 hover:bg-slate-800 rounded-xl shadow-lg px-8"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md animate-in fade-in zoom-in slide-in-from-bottom-8 duration-700">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 bg-slate-700 rounded-3xl flex items-center justify-center shadow-2xl">
              <Users className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <LinkIcon className="w-5 h-5 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Join Group</h1>
          <p className="text-gray-600">Enter the invite code to join a group</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-2xl">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm mb-6 animate-in slide-in-from-left duration-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-slate-600" />
                Invite Code
                <span className="text-red-500">*</span>
              </label>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                className="bg-gray-50 border-2 border-gray-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 font-mono font-bold text-center text-lg h-14 rounded-xl uppercase tracking-wider"
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleJoin}
              disabled={loading || !inviteCode.trim()}
              className="w-full bg-slate-700 hover:bg-slate-800 h-14 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] font-bold text-lg"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full"></div>
                  <span>Joining Group...</span>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Join Group
                  <Sparkles className="h-4 w-4" />
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate("/chat")}
              className="w-full hover:bg-gray-100 rounded-xl h-12 font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chats
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinInvitePage;
