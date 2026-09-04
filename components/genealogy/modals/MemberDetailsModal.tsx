import { useState, useEffect } from 'react'
import { Users, X, Smile, Copy, Calendar, ArrowUpRight, Star, Coins, Sparkles, Gift, Award, ArrowDown, ArrowUp, User } from 'lucide-react'
import { MemberDetailInfo } from '@/components/genealogy/lib/genealogy-helpers'
import { getMemberPromotionHistoryAction } from '@/app/actions/admin-actions'
import SystemConnectionPathModal from '@/components/genealogy/modals/SystemConnectionPathModal'

function MemberDetailsModal({ info, onClose, selectedSystem }: { info: MemberDetailInfo, onClose: () => void, selectedSystem: number | null }) {
  const [showHistory, setShowHistory] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLevelConfigs, setHistoryLevelConfigs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [nhanDuyenOpen, setNhanDuyenOpen] = useState(false);
  const [nhanDuyenA, setNhanDuyenA] = useState<number | null>(null);
  const [nhanDuyenZ, setNhanDuyenZ] = useState<number | null>(null);

  const handleShowNhanDuyen = (ancId: number, descId: number) => {
    setNhanDuyenA(ancId);
    setNhanDuyenZ(descId);
    setNhanDuyenOpen(true);
  };

  const renderDescriptionWithNhanDuyen = (description: string, targetMemberId?: number, targetMemberName?: string) => {
    if (!targetMemberId) return <span>{description}</span>;

    const normalizedDesc = description.toLowerCase();
    let nameIndex = -1;
    let matchLength = 0;

    if (targetMemberName) {
      const normalizedName = targetMemberName.toLowerCase().trim();
      nameIndex = normalizedDesc.indexOf(normalizedName);
      matchLength = targetMemberName.trim().length;
    }

    if (nameIndex === -1) {
      const idPattern = `#${targetMemberId}`;
      nameIndex = normalizedDesc.indexOf(idPattern);
      matchLength = idPattern.length;
    }

    if (nameIndex === -1) {
      return (
        <span className="inline-flex flex-wrap items-center gap-1 leading-normal">
          <span>{description}</span>
          <button
            onClick={() => handleShowNhanDuyen(info.userId, targetMemberId)}
            className="inline-flex items-center gap-0.5 text-[9px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1 py-0.5 rounded border border-indigo-100 font-bold transition-all shadow-sm shrink-0"
            title="Xem nhân duyên"
          >
            <Users className="w-2.5 h-2.5 inline mr-0.5" />
            Xem nhân duyên
          </button>
        </span>
      );
    }

    const before = description.substring(0, nameIndex + matchLength);
    const after = description.substring(nameIndex + matchLength);

    return (
      <span className="leading-normal">
        <span>{before}</span>
        <button
          onClick={() => handleShowNhanDuyen(info.userId, targetMemberId)}
          className="inline-flex items-center gap-0.5 text-[9px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1 py-0.5 mx-1 rounded border border-indigo-100 font-bold transition-all shadow-sm shrink-0"
          title="Xem nhân duyên"
        >
          <Users className="w-2.5 h-2.5 inline mr-0.5" />
          Xem nhân duyên
        </button>
        <span>{after}</span>
      </span>
    );
  };

  useEffect(() => {
    if (showHistory && info.userId && selectedSystem) {
      setLoadingHistory(true);
      getMemberPromotionHistoryAction(info.userId, selectedSystem).then(res => {
        if (res.success && res.history) {
          setHistoryRecords(res.history);
        }
        if (res.levelConfigs) {
          setHistoryLevelConfigs(res.levelConfigs);
        }
        setLoadingHistory(false);
      });
    }
  }, [showHistory, info.userId, selectedSystem]);

  const formatFullDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const pad3 = (n: number) => String(n).padStart(3, '0');
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
  };

  const formatDateWithSmallTime = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const datePart = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    const timePart = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    return (
      <span className="flex items-baseline gap-1 select-all">
        <span className="font-extrabold text-slate-700">{datePart}</span>
        <span className="text-[10px] text-slate-400 font-semibold">{timePart}</span>
      </span>
    );
  };

  const formatMbpPoints = (points: number | null | undefined) => {
    if (points == null) return '0';
    const formattedStr = points.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 3 
    });
    const parts = formattedStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    return (
      <span className="flex items-baseline font-mono select-all">
        <span className="text-slate-800 text-sm sm:text-base font-black">{integerPart}</span>
        {decimalPart && (
          <span className="text-slate-400 text-[10px] font-semibold">.{decimalPart}</span>
        )}
        <span className="text-slate-400 text-[10px] font-extrabold ml-1">MBP</span>
      </span>
    );
  };

  const getLevelDetails = (lvl: number) => {
    const cfg = historyLevelConfigs.find((c: any) => c.level === lvl);
    if (cfg) return { pct: cfg.pct, gift: cfg.gift };
    switch (lvl) {
      case 1: return { pct: '21%', gift: 0 };
      case 2: return { pct: '30%', gift: 500000 };
      case 3: return { pct: '39%', gift: 1000000 };
      case 4: return { pct: '52.5%', gift: 2000000 };
      case 5: return { pct: '64.5%', gift: 4000000 };
      case 6: return { pct: '70.5%', gift: 8000000 };
      case 7: return { pct: '75%', gift: 16000000 };
      case 8: return { pct: '78%', gift: 32000000 };
      default: return { pct: '21%', gift: 0 };
    }
  };

  if (!info.show) return null;

  const { user, tca, systemData, enrollment } = info.data || {};
  const isLoading = info.loading;
  const isBrk = !!systemData;

  const currentLevelText = isBrk
    ? (systemData?.level ? `Cấp ${systemData.level}` : 'Chưa có')
    : (tca?.level ? `Cấp ${tca.level}` : 'Thành viên');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-3 sm:p-4 transition-all duration-300">
      <div className="bg-white w-full max-w-sm sm:max-w-lg rounded-[24px] sm:rounded-[32px] shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in duration-300 max-h-[80vh] overflow-hidden">
        {/* Header Gradient mỏng - avatar góc trái chồm xuống dưới, text bên phải */}
        <div className={`rounded-t-[24px] sm:rounded-t-[32px] bg-gradient-to-r ${isBrk ? 'from-teal-600 to-emerald-600' : tca ? 'from-indigo-600 to-violet-600' : 'from-emerald-600 to-teal-600'} relative`}>
          <button
            onClick={onClose}
            className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-1.5 sm:p-2 bg-rose-500 hover:bg-rose-600 rounded-full transition-all text-white shadow-md z-20"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <div className="flex items-start gap-1.5 sm:gap-2 px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white p-0.5 border-2 border-white shadow-lg shrink-0 -mb-10 sm:-mb-12">
              <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden ${isBrk ? 'bg-emerald-500' : tca ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                {user?.image ? (
                  <img src={user.image} alt={user.name || ''} className="w-full h-full object-cover" />
                ) : (
                  <Smile className="w-7 h-7 sm:w-8 sm:h-8 text-white/80" />
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col min-w-0 pt-0.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-300 mb-1">
                {isBrk ? 'MB - Dòng chảy phước báu' : 'Hệ thống'}
              </span>
              <div className="flex items-center justify-between gap-2 w-full pr-1 sm:pr-2">
                <div className="flex flex-col min-w-0">
                  <h3 className="text-white text-sm sm:text-base font-bold tracking-tight leading-tight uppercase select-all">
                    {tca?.name || user?.name || 'Thành viên'}
                  </h3>
                  <span className="text-white/85 text-[10px] sm:text-xs font-semibold mt-1 select-all flex items-center gap-1">
                    {user?.phone ? (
                      <>
                        <span>📞 {user.phone}</span>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(user.phone); }}
                          className="p-0.5 hover:bg-white/20 rounded transition-all"
                          title="Sao chép số điện thoại"
                        >
                          <Copy className="w-3 h-3 text-white/70 hover:text-white" />
                        </button>
                      </>
                    ) : 'Chưa cập nhật SĐT'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-3 sm:px-4 pb-5 sm:pb-6 flex flex-col overflow-y-auto pt-3 sm:pt-4 relative z-10">
          {isLoading ? (
            <div className="py-8 sm:py-12 flex flex-col items-center justify-center gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full"></div>
              <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">Đang tải thông tin...</span>
            </div>
          ) : (
            <>
              <div className="space-y-1.5 sm:space-y-2">
                {/* Upline Leaders & Referrers */}
                <div className="p-2.5 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl mb-2 text-[10px] sm:text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-indigo-750 font-semibold">
                    <span>Nhân mạch kết nối:</span>
                    <span className="font-bold text-indigo-900">
                      {user?.referrer ? (
                        <>
                          {user.referrer.name}{' '}
                          <code className="bg-indigo-100/70 px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold">#{user.referrer.id}</code>
                        </>
                      ) : 'Chưa cập nhật'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-indigo-750 font-semibold pt-1.5 border-t border-indigo-100/30">
                    <span>Nhân mạch chia sẻ:</span>
                    <span className="font-bold text-indigo-900">
                      {enrollment?.referrer ? (
                        <>
                          {enrollment.referrer.name}{' '}
                          <code className="bg-indigo-100/70 px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold">#{enrollment.referrer.id}</code>
                        </>
                      ) : 'Chưa cập nhật'}
                    </span>
                  </div>

                </div>

                {/* Khối thông tin 2 cột mới: Trái (ID/Xem nhân duyên), Phải (Cấp/Hoa hồng) */}
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2">
                  <div className="flex flex-col gap-1.5 p-2 rounded-2xl bg-slate-50 border border-slate-100/50">
                    <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-slate-400 uppercase leading-none">Mã thành viên</span>
                    <div className="flex items-center justify-between gap-1.5 flex-wrap w-full">
                      <span className="bg-yellow-300 text-purple-950 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500 shadow-sm select-all shrink-0">
                        #{info.userId}
                      </span>
                      {isBrk && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShowNhanDuyen(selectedSystem === 4 ? 3773 : 0, info.userId); }}
                          className="inline-flex items-center gap-0.5 text-[9px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-100 font-bold transition-all shadow-sm shrink-0 font-mono ml-auto"
                          title="Xem nhân duyên từ gốc hệ thống"
                        >
                          <Users className="w-2.5 h-2.5 inline mr-0.5" />
                          Nhân duyên
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 p-2 rounded-2xl bg-slate-50 border border-slate-100/50">
                    <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-slate-400 uppercase leading-none">Cấp bậc & Hoa hồng</span>
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="bg-purple-950 text-yellow-300 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.5)] select-none shrink-0 font-extrabold">
                        {currentLevelText}
                      </span>
                      {isBrk && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">
                          {getLevelDetails(systemData?.level || 1).pct} 
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isBrk ? (
                  <>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <InfoItem icon={<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />} label="Ngày tham gia" value={formatDateWithSmallTime(systemData?.joinedAt)} />
                      <InfoItem icon={<ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />} label="Ngày lên cấp" value={formatDateWithSmallTime(systemData?.levelUpdatedAt)} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      <InfoItem icon={<Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />} label="Điểm MBP" value={formatMbpPoints(systemData?.totalPoints)} />
                      <InfoItem icon={<Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />} label="Số thành viên nhóm" value={systemData?.teamSize != null ? `${systemData.teamSize.toLocaleString('vi')}` : '0'} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                      <InfoItem icon={<User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} label="ID Hệ thống" value={tca?.tcaId ? `#${tca.tcaId}` : 'Chưa cập nhật'} />
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                      <InfoItem icon={<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />} label="Ngày tham gia" value={formatDateWithSmallTime(user?.createdAt)} />
                    </div>
                  </>
                )}
              </div>

              {/* Wallet & Revenue Section (BRK only) */}
              {isBrk && systemData?.wallet && (
                <div className="mt-2 space-y-1.5 sm:space-y-2">
                  {/* Dòng 1: Doanh số MBDT (trái) & Thu nhập MBDT (phải) */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <WalletItem
                      icon={<Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />}
                      label="Doanh số MBDT"
                      value={systemData?.teamTotalBrkd || 0}
                      labelClassName="text-[9px] text-emerald-600 font-bold uppercase tracking-wider"
                      valueClassName="text-[14px] font-extrabold text-red-500"
                    />
                    <WalletItem
                      icon={<Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />}
                      label="Thu nhập MBDT"
                      value={systemData.wallet.brkd}
                      labelClassName="text-[9px] text-emerald-600 font-bold uppercase tracking-wider"
                      valueClassName="text-[14px] font-extrabold text-red-500"
                    />
                  </div>

                  {/* Dòng 2: Doanh số VNĐ (trái) & Thu nhập VNĐ (phải) */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <InfoItem
                      icon={<Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />}
                      label="Doanh số VNĐ"
                      value={systemData?.teamTotalVnd != null ? systemData.teamTotalVnd.toLocaleString('vi') : '0'}
                      valueClassName="text-[11px] font-semibold text-slate-500"
                    />
                    <WalletItem
                      icon={<Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />}
                      label="Thu nhập VNĐ"
                      value={systemData.wallet.totalEarned}
                      valueClassName="text-[11px] font-semibold text-slate-500"
                    />
                  </div>

                  {/* Dòng 3: MB Voucher (trái) & Số dư (VNĐ) (phải) */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <WalletItem
                      icon={<Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />}
                      label="MB Voucher"
                      value={systemData.wallet.mbvBalance}
                    />
                    <WalletItem
                      icon={<ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />}
                      label="Số dư (VNĐ)"
                      value={systemData.wallet.balance}
                    />
                  </div>
                </div>
              )}

              {/* Promotion History Button - mt-2 và bỏ border-t / padding ngăn cách */}
              {isBrk && (
                <div className="mt-2 flex justify-center">
                  <button
                    onClick={() => setShowHistory(true)}
                    className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md hover:scale-[1.02] transition-all uppercase tracking-wider"
                  >
                    Xem lịch sử phát triển
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* History Modal Popup */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-955/70 backdrop-blur-sm z-[350] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-[98%] max-w-md md:max-w-lg rounded-3xl shadow-2xl border border-slate-100 flex flex-col h-[75vh] max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                <h4 className="text-sm font-black uppercase tracking-wider">Lịch sử Phát triển</h4>
                <button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  title={sortOrder === 'desc' ? "Mới nhất trước" : "Cũ nhất trước"}
                  className="p-1 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-all text-slate-400 hover:text-white flex items-center justify-center ml-2"
                >
                  {sortOrder === 'desc' ? (
                    <ArrowDown className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowUp className="w-4 h-4 text-rose-500" />
                  )}
                </button>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 bg-slate-800 hover:bg-slate-700 rounded-full transition-all text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50 flex flex-col gap-4">
              {loadingHistory ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent animate-spin rounded-full"></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải lịch sử...</span>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Smile className="w-10 h-10 opacity-40" />
                  <span className="text-xs font-black uppercase tracking-wide">Chưa ghi nhận lịch sử thăng tiến</span>
                </div>
              ) : (
                <>

                  <div className="relative pl-6 border-l border-slate-200 space-y-5">
                  {(() => {
                    const sortedRecords = [...historyRecords].sort((a, b) => {
                      const diff = new Date(a.time).getTime() - new Date(b.time).getTime()
                      if (diff !== 0) {
                        return sortOrder === 'desc' ? -diff : diff
                      }
                      const idA = a.id || 0
                      const idB = b.id || 0
                      return sortOrder === 'desc' ? idB - idA : idA - idB
                    })

                    return sortedRecords.map((rec, i) => {
                      if (rec.type === 'ACTIVATION') {
                        return (
                          <div key={i} className="relative">
                            {/* Timeline dot */}
                            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-md" />
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black text-blue-600">{rec.title || 'Tham gia hệ thống'}</span>
                                <span className="text-[10px] font-medium text-slate-400">
                                  {new Date(rec.time).toLocaleString('vi-VN')}
                                </span>
                              </div>
                              <span className="text-slate-500 text-[11px] font-medium leading-normal">{rec.description}</span>

                              {/* Thông số tăng trưởng tích lũy */}
                              <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 font-semibold">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Điểm:</span>
                                  <span className="font-black text-slate-700">{rec.accumulatedBrkp?.toLocaleString('vi')} MBP</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Thành viên nhóm:</span>
                                  <span className="font-black text-slate-700">{rec.accumulatedTeamSize?.toLocaleString('vi')}</span>
                                </div>

                                {/* Bố cục 2 cột Trái (Doanh số MBDT) và Phải (Thu nhập MBDT) */}
                                <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                                  {/* Cột trái: Doanh số MBDT & Doanh số VNĐ */}
                                  <div className="flex flex-col gap-1 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Doanh số (MBDT)</span>
                                      <span className="font-extrabold text-[14px] text-red-500">
                                        {Math.round(rec.accumulatedBrkdVolume ?? 0).toLocaleString('vi')}
                                      </span>
                                    </div>
                                    <div className="flex flex-col border-t border-slate-200/50 pt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Doanh số VNĐ</span>
                                      <span className="font-semibold text-[8px] text-slate-400/80">
                                        {Math.round(rec.accumulatedCashVolume ?? 0).toLocaleString('vi')} VNĐ
                                      </span>
                                    </div>
                                  </div>

                                  {/* Cột phải: Thu nhập MBDT & Thu nhập VNĐ */}
                                  <div className="flex flex-col gap-1 bg-emerald-50/50 border border-emerald-100/50 p-2 rounded-xl">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Thu nhập </span>
                                      <span className="font-extrabold text-[14px] text-red-500">
                                        {Math.round(rec.accumulatedBrkd ?? 0).toLocaleString('vi')}
                                      </span>
                                    </div>
                                    <div className="flex flex-col border-t border-emerald-100/50 pt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Thu nhập </span>
                                      <span className="font-medium text-[8px] text-slate-400/80">
                                        {Math.round(rec.accumulatedCash ?? 0).toLocaleString('vi')} VNĐ
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (rec.type === 'LEVEL_UP') {
                        const fromLvlDetails = getLevelDetails(rec.details?.fromLevel ?? 1);
                        const toLvlDetails = getLevelDetails(rec.details?.toLevel ?? 1);
                        return (
                          <div key={i} className="relative">
                            {/* Timeline dot */}
                            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-md" />
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black text-amber-600">Thăng tiến cấp bậc</span>
                                <span className="text-[10px] font-medium text-slate-400">
                                  {new Date(rec.time).toLocaleString('vi-VN')}
                                </span>
                              </div>
                              <span className="text-slate-800 text-xs font-black">
                                Cấp {rec.details?.fromLevel} (+{rec.accumulatedBrkp?.toLocaleString('vi')} MBP) ➔ Cấp {rec.details?.toLevel}
                              </span>
                              <div className="mt-1 pt-1.5 border-t border-slate-50 flex flex-col gap-1 text-[11px]">
                                <div className="flex items-center justify-between text-slate-500">
                                  <span>Tỷ lệ hoa hồng:</span>
                                  <span className="font-extrabold text-slate-700">
                                    {fromLvlDetails.pct} ➔ <span className="text-emerald-600 font-black">{toLvlDetails.pct}</span>
                                  </span>
                                </div>
                                {rec.details?.amountVoucher > 0 && (
                                  <div className="flex items-center justify-between text-slate-500 mt-1">
                                    <span>Quà tặng thăng cấp:</span>
                                    <span className="font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                      +{Math.round(rec.details.amountVoucher).toLocaleString('vi')} MBV
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Thông số tăng trưởng tích lũy */}
                              <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 font-semibold">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Điểm:</span>
                                  <span className="font-black text-slate-700">{rec.accumulatedBrkp?.toLocaleString('vi')} MBP</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Thành viên nhóm:</span>
                                  <span className="font-black text-slate-700">{rec.accumulatedTeamSize?.toLocaleString('vi')}</span>
                                </div>

                                {/* Bố cục 2 cột Trái (Doanh số MBDT) và Phải (Thu nhập MBDT) */}
                                <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                                  {/* Cột trái: Doanh số MBDT & Doanh số VNĐ */}
                                  <div className="flex flex-col gap-1 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Doanh số (MBDT)</span>
                                      <span className="font-extrabold text-[14px] text-red-500">
                                        {Math.round(rec.accumulatedBrkdVolume ?? 0).toLocaleString('vi')}
                                      </span>
                                    </div>
                                    <div className="flex flex-col border-t border-slate-200/50 pt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Doanh số </span>
                                      <span className="font-semibold text-[8px] text-slate-400/80">
                                        {Math.round(rec.accumulatedCashVolume ?? 0).toLocaleString('vi')} VNĐ
                                      </span>
                                    </div>
                                  </div>

                                  {/* Cột phải: Thu nhập MBDT & Thu nhập VNĐ */}
                                  <div className="flex flex-col gap-1 bg-emerald-50/50 border border-emerald-100/50 p-2 rounded-xl">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Thu nhập </span>
                                      <span className="font-extrabold text-[14px] text-red-500">
                                        {Math.round(rec.accumulatedBrkd ?? 0).toLocaleString('vi')}
                                      </span>
                                    </div>
                                    <div className="flex flex-col border-t border-emerald-100/50 pt-1">
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Thu nhập </span>
                                      <span className="font-medium text-[8px] text-slate-400/80">
                                        {Math.round(rec.accumulatedCash ?? 0).toLocaleString('vi')} VNĐ
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (rec.type === 'LEVEL_DOWN') {
                        const fromLvlDetails = getLevelDetails(rec.details?.fromLevel ?? 1);
                        const toLvlDetails = getLevelDetails(rec.details?.toLevel ?? 1);
                        return (
                          <div key={i} className="relative">
                            <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-rose-500 border-4 border-white shadow-md" />
                            <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-sm flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black text-rose-600">Hạ cấp bậc</span>
                                <span className="text-[10px] font-medium text-slate-400">
                                  {new Date(rec.time).toLocaleString('vi-VN')}
                                </span>
                              </div>
                              <span className="text-slate-800 text-xs font-black">
                                Cấp {rec.details?.fromLevel} ➔ Cấp {rec.details?.toLevel}
                              </span>
                              {rec.description && (
                                <span className="text-[11px] text-slate-500">{rec.description}</span>
                              )}
                              <div className="mt-1 pt-1.5 border-t border-slate-50 flex flex-col gap-1 text-[11px]">
                                <div className="flex items-center justify-between text-slate-500">
                                  <span>Tỷ lệ hoa hồng:</span>
                                  <span className="font-extrabold text-slate-700">
                                    {fromLvlDetails.pct} ➔ <span className="text-rose-600 font-black">{toLvlDetails.pct}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 font-semibold">
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Điểm:</span>
                                  <span className="font-black text-slate-700">{rec.accumulatedBrkp?.toLocaleString('vi')} MBP</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400">Thành viên nhóm:</span>
                                  <span className="font-black text-slate-700">{rec.accumulatedTeamSize?.toLocaleString('vi')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // TRANSACTION
                      const amountCash = rec.details?.amountCash ?? 0;
                      const amountBrkd = rec.details?.amountBrkd ?? 0;
                      const amountVoucher = rec.details?.amountVoucher ?? 0;

                      let dotColor = 'bg-emerald-500';
                      let badgeColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';

                      if (amountBrkd > 0 && amountCash === 0) {
                        dotColor = 'bg-rose-500';
                        badgeColor = 'text-rose-600 bg-rose-50 border-rose-100';
                      } else if (amountVoucher > 0 && amountCash === 0) {
                        dotColor = 'bg-amber-500';
                        badgeColor = 'text-amber-600 bg-amber-50 border-amber-100';
                      }

                      return (
                        <div key={i} className="relative">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full ${dotColor} border-4 border-white shadow-md`} />
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${badgeColor}`}>
                                {rec.title}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400">
                                {new Date(rec.time).toLocaleString('vi-VN')}
                              </span>
                            </div>

                            <div className="flex items-start justify-between gap-4 mt-1">
                              <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <span className="text-slate-500 text-[11px] font-medium leading-normal">
                                  {renderDescriptionWithNhanDuyen(rec.description, rec.details?.targetMemberId, rec.details?.targetMemberName)}
                                </span>
                              </div>

                              <div className="flex flex-col items-end shrink-0 gap-0.5 text-right font-black">
                                {amountBrkd !== 0 && (
                                  <span className={`text-sm ${amountBrkd > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                    {amountBrkd > 0 ? '+' : ''}{Math.round(amountBrkd).toLocaleString('vi')}
                                  </span>
                                )}
                                {amountCash !== 0 && (
                                  <span className="text-[10px] text-slate-500 font-semibold">
                                    {amountCash > 0 ? '+' : ''}{Math.round(amountCash).toLocaleString('vi')} VNĐ
                                  </span>
                                )}
                                {amountVoucher !== 0 && (
                                  <span className="text-purple-600 text-[10px]">
                                    +{Math.round(amountVoucher).toLocaleString('vi')} MBV
                                  </span>
                                )}
                              </div>
                            </div>



                            {/* Thông số tăng trưởng tích lũy */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 font-semibold">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">Điểm:</span>
                                <span className="font-black text-slate-700">{rec.accumulatedBrkp?.toLocaleString('vi')} MBP</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">Thành viên nhóm:</span>
                                <span className="font-black text-slate-700">{rec.accumulatedTeamSize?.toLocaleString('vi')}</span>
                              </div>

                              {/* Bố cục 2 cột Trái (Doanh số MBDT) và Phải (Thu nhập MBDT) */}
                              <div className="col-span-2 grid grid-cols-2 gap-2 mt-1">
                                {/* Cột trái: Doanh số MBDT & Doanh số VNĐ */}
                                <div className="flex flex-col gap-1 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Doanh số (MBDT)</span>
                                    <span className="font-extrabold text-[14px] text-red-500">
                                      {Math.round(rec.accumulatedBrkdVolume ?? 0).toLocaleString('vi')}
                                    </span>
                                  </div>
                                  <div className="flex flex-col border-t border-slate-200/50 pt-1">
                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Doanh số VNĐ</span>
                                    <span className="font-semibold text-[8px] text-slate-400/80">
                                      {Math.round(rec.accumulatedCashVolume ?? 0).toLocaleString('vi')} VNĐ
                                    </span>
                                  </div>
                                </div>

                                {/* Cột phải: Thu nhập MBDT & Thu nhập VNĐ */}
                                <div className="flex flex-col gap-1 bg-emerald-50/50 border border-emerald-100/50 p-2 rounded-xl">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Thu nhập </span>
                                    <span className="font-extrabold text-[14px] text-red-500">
                                      {Math.round(rec.accumulatedBrkd ?? 0).toLocaleString('vi')}
                                    </span>
                                  </div>
                                  <div className="flex flex-col border-t border-emerald-100/50 pt-1">
                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Thu nhập </span>
                                    <span className="font-medium text-[8px] text-slate-400/80">
                                      {Math.round(rec.accumulatedCash ?? 0).toLocaleString('vi')} VNĐ
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP CÂY NHÂN DUYÊN */}
      <SystemConnectionPathModal
        isOpen={nhanDuyenOpen}
        onClose={() => setNhanDuyenOpen(false)}
        ancestorId={nhanDuyenA}
        descendantId={nhanDuyenZ || 0}
        systemId={selectedSystem || 4}
      />
    </div>
  );
}

function InfoItem({ icon, label, value, valueClassName, labelClassName }: { icon: any, label: string, value: React.ReactNode, valueClassName?: string, labelClassName?: string }) {
  return (
    <div className="flex items-start gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-slate-50 border border-slate-100/50">
      <div className="mt-0.5 p-1 sm:p-1.5 bg-white rounded-lg shadow-sm text-slate-500">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`text-[9px] sm:text-[10px] font-bold tracking-widest leading-none mb-0.5 sm:mb-1 ${labelClassName || 'text-slate-400'}`}>{label}</span>
        <span className={`text-xs sm:text-sm font-black truncate ${valueClassName || 'text-slate-700'}`}>{value}</span>
      </div>
    </div>
  );
}

function WalletItem({ icon, label, value, valueClassName, labelClassName }: { icon: any, label: string, value: number, valueClassName?: string, labelClassName?: string }) {
  return (
    <div className="flex items-start gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-slate-50 border border-slate-100/50">
      <div className="mt-0.5 p-1 sm:p-1.5 bg-white rounded-lg shadow-sm text-slate-500">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`text-[9px] sm:text-[10px] font-bold tracking-widest leading-none mb-0.5 sm:mb-1 ${labelClassName || 'text-slate-400'}`}>{label}</span>
        <span className={`text-xs sm:text-sm font-black truncate ${valueClassName || 'text-slate-700'}`}>{value.toLocaleString('vi', { maximumFractionDigits: 0 })}</span>
      </div>
    </div>
  );
}

export default MemberDetailsModal
