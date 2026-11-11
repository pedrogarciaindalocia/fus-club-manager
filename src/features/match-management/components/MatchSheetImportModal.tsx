import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Shield,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Users,
  Flame,
  Sparkles,
  ClipboardPaste,
  Scan,
  Trash2,
  Bot,
  Key,
  Eye,
  EyeOff,
  Zap,
  ExternalLink,
  Settings2,
  AlertCircle,
  ArrowLeftRight,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  VALIDATED_SEASONS,
  buildMyClubContext,
  computeSurclassementFromCategory,
  evaluateSurclassement,
  extractTextFromPDFFile,
  isMyClubName,
  normalizeSeasonFormat,
  parseFRMFMatchSheetText,
  resolveClubAbbreviation,
} from '../utils/frmfMatchSheetParser';
import {
  matchSheetIngestionService,
  normalizeTimeHHMM,
  type MatchSheetAuditPreview,
} from '../../../services/matchSheetIngestionService';
import {
  geminiVisionService,
  AVAILABLE_GEMINI_MODELS,
  type GeminiConnectionTestResult,
} from '../../../services/geminiVisionService';
import { getClubLogoUrl } from '../../../utils/clubLogos';
import { useClubData } from '../../../hooks/useClubData';
import { useCompetitions } from '../../../hooks/useCompetitions';
import { PLAYER_CATEGORIES } from '../../../constants';
import { MyClubMissingPlayersPanel } from './MyClubMissingPlayersPanel';
import type { FRMFPlayer, ParsedMatchSheet } from '../types/matchSheetTypes';
import type { Player } from '../../../types';

interface MatchSheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MatchSheetImportModal: React.FC<MatchSheetImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { mainClub, opponentClubs } = useClubData();
  const { leagues } = useCompetitions();

  const myClubContext = useMemo(() => buildMyClubContext(mainClub), [mainClub]);

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedMatchSheet | null>(null);
  const [auditPreview, setAuditPreview] = useState<MatchSheetAuditPreview | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'review'>('upload');
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'lineups'>('overview');
  const [rawTextFallback, setRawTextFallback] = useState('');
  const [showPasteZone, setShowPasteZone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sélections utilisateur (Compétition, Saison 2026/27, Club adversaire)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<string>('2026/27');
  const [opponentMode, setOpponentMode] = useState<'existing' | 'create'>('existing');
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('');
  const [opponentSearch, setOpponentSearch] = useState<string>('');
  const [newOpponentName, setNewOpponentName] = useState<string>('');
  const [newOpponentShortName, setNewOpponentShortName] = useState<string>('');
  const [newOpponentCity, setNewOpponentCity] = useState<string>('');
  const [confirmCreateOpponent, setConfirmCreateOpponent] = useState<boolean>(false);

  // Configuration Gemini AI
  const [geminiApiKey, setGeminiApiKey] = useState(() => geminiVisionService.getApiKey());
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => geminiVisionService.getSelectedModel());
  const [scanMode, setScanMode] = useState<'gemini' | 'local'>('gemini');
  const [showGeminiConfig, setShowGeminiConfig] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<GeminiConnectionTestResult | null>(null);

  React.useEffect(() => {
    if (selectedModel.includes('2.0') || selectedModel.includes('1.5') || selectedModel.includes('2.5')) {
      setSelectedModel('gemini-3.8-flash');
      geminiVisionService.saveSelectedModel('gemini-3.8-flash');
    }
  }, [selectedModel]);

  // Vérification dynamique en base par Date, Heure, Adversaire et Catégorie
  const [livePlannedMatchCheck, setLivePlannedMatchCheck] = useState<{ exists: boolean; match?: any }>({ exists: false });
  const [isCheckingPlannedMatch, setIsCheckingPlannedMatch] = useState(false);

  useEffect(() => {
    if (activeTab !== 'review' || !parsedData) return;
    if (opponentMode !== 'existing' || !selectedOpponentId || !parsedData.date || !parsedData.category) {
      setLivePlannedMatchCheck({ exists: false });
      return;
    }

    let active = true;
    setIsCheckingPlannedMatch(true);
    matchSheetIngestionService
      .checkExistingPlannedMatch({
        clubId: mainClub?.id,
        opponentId: selectedOpponentId,
        matchDate: parsedData.date,
        matchTime: parsedData.time,
        category: parsedData.category,
      })
      .then((res) => {
        if (active) setLivePlannedMatchCheck(res);
      })
      .catch(() => {
        if (active) setLivePlannedMatchCheck({ exists: false });
      })
      .finally(() => {
        if (active) setIsCheckingPlannedMatch(false);
      });

    return () => {
      active = false;
    };
  }, [
    activeTab,
    mainClub?.id,
    opponentMode,
    selectedOpponentId,
    parsedData?.date,
    parsedData?.time,
    parsedData?.category,
  ]);

  const effectivePlannedMatchCheck =
    opponentMode === 'existing' && selectedOpponentId
      ? livePlannedMatchCheck
      : { exists: false };

  const availableLeagues = useMemo(
    () => (auditPreview?.dbLeagues?.length ? auditPreview.dbLeagues : leagues),
    [auditPreview?.dbLeagues, leagues]
  );

  const availableOpponents = useMemo(() => {
    const base = auditPreview?.dbOpponentClubs?.length
      ? auditPreview.dbOpponentClubs
      : opponentClubs.filter(c => !isMyClubName(c.name || '', myClubContext));
    return base;
  }, [auditPreview?.dbOpponentClubs, opponentClubs, myClubContext]);

  const filteredOpponents = useMemo(() => {
    const q = opponentSearch.trim().toLowerCase();
    if (!q) return availableOpponents;
    return availableOpponents.filter(c => {
      const n = (c.name || '').toLowerCase();
      const s = ((c as any).short_name || '').toLowerCase();
      const city = (c.city || '').toLowerCase();
      return n.includes(q) || s.includes(q) || city.includes(q);
    });
  }, [availableOpponents, opponentSearch]);

  const seasonOptions = useMemo(() => {
    const set = new Set<string>(VALIDATED_SEASONS);
    availableLeagues.forEach(l => {
      if (l.season) set.add(normalizeSeasonFormat(l.season));
    });
    if (parsedData?.season) set.add(normalizeSeasonFormat(parsedData.season));
    if (selectedSeason) set.add(normalizeSeasonFormat(selectedSeason));
    return Array.from(set).sort().reverse();
  }, [availableLeagues, parsedData?.season, selectedSeason]);

  const handleTestGeminiInModal = async () => {
    const key = geminiApiKey.trim();
    if (!key) {
      toast.error("Veuillez d'abord saisir votre clé API Gemini.");
      return;
    }
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const result = await geminiVisionService.testConnection(key, selectedModel);
      setGeminiTestResult(result);
      if (result.success) {
        if (result.model && result.model !== selectedModel) {
          setSelectedModel(result.model);
        }
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      const res: GeminiConnectionTestResult = {
        success: false,
        model: selectedModel,
        latencyMs: 0,
        message: err?.message || 'Erreur lors du test de connexion',
      };
      setGeminiTestResult(res);
      toast.error(res.message);
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleSaveGeminiKeyInModal = () => {
    geminiVisionService.saveApiKey(geminiApiKey);
    geminiVisionService.saveSelectedModel(selectedModel);
    toast.success('Clé Gemini et modèle enregistrés avec succès !');
    setShowGeminiConfig(false);
  };

  // Exemple FRMF pré-chargé basé sur la feuille officielle FUS U16 vs OCK U16
  const SAMPLE_FRMF_TEXT = `
Compositions vérifiées par l'arbitre
Fédération Royale Marocaine de Football
Feuille de match
Saison 2026-2027
Catégorie U16
Date 2026-10-11
Heure 13:00
Terrain Centre de Formation FUS
Championnat Elite U16 – Sud
Journée 1
FUS (U16)
Fath Union Sport 2
Olympique Club Khouribga 1
OCK (U16)
Liste des joueurs convoqués au match
N° Joueurs d'équipe recevante Licence Type
1 Moumen LOUKILI AOUALI (G) 148877M11 T
2 Errami ADAM 069333M11 T
3 Sakri ALMUSTAPHA 074956M11 T
4 Zniber AMIR 290489M11 T
5 Boukani AYMEN 063897M11 T
6 Ben kaddour YASSINE (C) 241981M11 T
7 Leghrafi AHMED AMINE 106777M11 T
11 Akhraibcha ADAM 314585M11 T
13 Mesti YOUSSEF 188478M11 T
14 Aouchi YOUSSEF 063053M11 T
18 Khadrouf ZAKARIA 107305M11 T
24 Terrabi TAOUFIK (G) 152923M12 R
25 Aziz JAD 180973M11 R
26 Taoufiki CHOUAIB 070591M11 R
32 El moustir ZIAD 125928M11 R
N° Joueurs d'équipe visiteuse Licence Type
2 Mhaidra KHAYREDDINE 126799M11 T
3 En-nafaa NIZAR 290832M11 T
4 Chakiri OMAR 057952M11 T
6 Elbouhali AYOUB 119957M11 T
8 Rahnaoui AYOUB 063887M11 T
9 Ikhlef IMRANE (C) 218839M11 T
11 Monssif BILAL 219046M11 T
12 Marouf AZALARAB (G) 258158M11 T
14 Fanjaoui MOUAD 218821M11 T
15 El gallaf OUSSAMA 213891M11 T
19 Bounab YOUSSEF 266521M11 T
1 Chetouane ANAS (G) 218833M11 R
10 Sabri MOHAMED 218838M11 R
16 Ferdad MOHAMED 213774M11 R
17 Oulahyane YASSINE 281829M11 R
20 Lamsadi YASSINE 068586M11 R
Changements
18 Khadrouf ZAKARIA -> 25 Aziz JAD 65'
Buts
14 aouchi youssef Régulier 34
14 aouchi youssef Régulier 39
11 monssif bilal Régulier 12
Joueurs ou officiels d'équipes avertis
19 Bounab YOUSSEF Joueur 28'
Joueurs ou officiels d'équipes expulsés
8 Rahnaoui AYOUB Joueur 42'
Joueurs blessés
11 Monssif BILAL 90'
2 Mhaidra KHAYREDDINE 70'
Les officiels du match
Aissam ZAIDI Arbitre
Youssef BARNI Arbitre Assistant 2
Abdelbasset AIT TALEB Arbitre Assistant 1
HMARRASS OMAR Commissaire du Match
`;

  const applyParsedData = async (parsed: ParsedMatchSheet) => {
    try {
      const preview = await matchSheetIngestionService.prepareMatchSheetAudit(
        parsed,
        opponentClubs,
        leagues,
        myClubContext
      );
      setParsedData({ ...parsed });
      setAuditPreview(preview);
      setSelectedSeason(normalizeSeasonFormat(parsed.season));
      setSelectedLeagueId(preview.matchedLeagueId || '');
      setOpponentSearch('');

      if (preview.matchedOpponentClub) {
        setOpponentMode('existing');
        setSelectedOpponentId(preview.matchedOpponentClub.id);
        setConfirmCreateOpponent(false);
      } else {
        setOpponentMode('create');
        setSelectedOpponentId('');
        setNewOpponentName(preview.suggestedOpponentName);
        setNewOpponentShortName(preview.suggestedOpponentShortName);
        setNewOpponentCity('');
        setConfirmCreateOpponent(false);
      }
      setActiveTab('review');
    } catch (err: any) {
      console.warn('[applyParsedData] Erreur audit pré-import:', err);
      setParsedData(parsed);
      setAuditPreview(null);
      setSelectedSeason(normalizeSeasonFormat(parsed.season));
      setActiveTab('review');
    }
  };

  /**
   * Ré-évalue les surclassements si l'utilisateur change manuellement la catégorie ou la saison dans la revue
   */
  const reevaluateSurclassements = (nextData: ParsedMatchSheet, nextCategory: string, nextSeason: string): ParsedMatchSheet => {
    const updateList = (list: FRMFPlayer[]): FRMFPlayer[] =>
      list.map(p => {
        const dbSurc = p.matchedPlayerCategory
          ? computeSurclassementFromCategory(p.matchedPlayerCategory, nextCategory)
          : null;
        const licSurc = p.birthYear
          ? evaluateSurclassement(p.birthYear, nextCategory, nextSeason)
          : null;

        if (dbSurc?.isSurclasse) {
          return { ...p, ...dbSurc };
        }
        if (licSurc?.isSurclasse) {
          return { ...p, ...licSurc };
        }
        return {
          ...p,
          isSurclasse: false,
          expectedCategory: p.matchedPlayerCategory || licSurc?.expectedCategory || nextCategory,
          surclasseDiffYears: 0,
        };
      });

    const homePlayers = updateList(nextData.homePlayers);
    const awayPlayers = updateList(nextData.awayPlayers);
    const myClubList = nextData.isHomeMatch ? homePlayers : awayPlayers;
    const oppList = nextData.isHomeMatch ? awayPlayers : homePlayers;

    return {
      ...nextData,
      category: nextCategory,
      season: nextSeason,
      homePlayers,
      awayPlayers,
      surclassementsDetected: {
        myClub: myClubList.filter(p => p.isSurclasse),
        opponent: oppList.filter(p => p.isSurclasse),
      },
    };
  };

  /**
   * Inverse le statut Domicile/Extérieur si l'utilisateur corrige le camp My Club
   */
  const handleToggleMyClubSide = () => {
    if (!parsedData) return;
    const nextSide: 'home' | 'away' = parsedData.myClubSide === 'home' ? 'away' : 'home';
    const nextIsHome = nextSide === 'home';
    const nextMyClubName = nextIsHome ? parsedData.homeTeamName : parsedData.awayTeamName;
    const nextOppName = nextIsHome ? parsedData.awayTeamName : parsedData.homeTeamName;

    const updated: ParsedMatchSheet = {
      ...parsedData,
      myClubSide: nextSide,
      isHomeMatch: nextIsHome,
      myClubName: nextMyClubName,
      opponentName: nextOppName,
    };
    void applyParsedData(updated);
  };

  const updateMyClubPlayerAt = (playerIndex: number, updater: (p: FRMFPlayer) => FRMFPlayer) => {
    if (!parsedData) return;
    const isHome = parsedData.isHomeMatch;
    const targetList = isHome ? [...parsedData.homePlayers] : [...parsedData.awayPlayers];
    if (!targetList[playerIndex]) return;
    targetList[playerIndex] = updater({ ...targetList[playerIndex] });

    const nextHome = isHome ? targetList : parsedData.homePlayers;
    const nextAway = !isHome ? targetList : parsedData.awayPlayers;
    const myClubList = isHome ? nextHome : nextAway;

    setParsedData({
      ...parsedData,
      homePlayers: nextHome,
      awayPlayers: nextAway,
      surclassementsDetected: {
        ...parsedData.surclassementsDetected,
        myClub: myClubList.filter(p => p.isSurclasse),
      },
    });
  };

  const handleLinkExistingMyClubPlayer = (playerIndex: number, dbPlayer: Player) => {
    if (!parsedData || !auditPreview) return;
    updateMyClubPlayerAt(playerIndex, p => {
      const updated = { ...p, matchResolution: 'linked_existing' as const };
      return matchSheetIngestionService.bindMatchedMyClubPlayer(
        updated,
        dbPlayer,
        auditPreview.teams,
        parsedData.category,
        selectedSeason
      );
    });
    toast.success(`Joueur associé à "${dbPlayer.full_name}".`);
  };

  const handleCreatedMyClubPlayer = (playerIndex: number, created: Player) => {
    if (!parsedData || !auditPreview) return;
    setAuditPreview({
      ...auditPreview,
      allMyClubPlayers: [...auditPreview.allMyClubPlayers, created],
    });
    queryClient.invalidateQueries({ queryKey: ['players'] });

    updateMyClubPlayerAt(playerIndex, p => {
      const updated = { ...p, matchResolution: 'create_new' as const };
      return matchSheetIngestionService.bindMatchedMyClubPlayer(
        updated,
        created,
        auditPreview.teams,
        parsedData.category,
        selectedSeason
      );
    });
  };

  const handleSetIgnoredMyClubPlayer = (playerIndex: number, ignored: boolean) => {
    updateMyClubPlayerAt(playerIndex, p => ({
      ...p,
      matchResolution: ignored ? 'ignored' : undefined,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    toast.info(`Fichier "${selectedFile.name}" sélectionné. Cliquez sur "Scanner la feuille de match" pour démarrer l'analyse.`);
  };

  const handleScanFile = async () => {
    if (!file) {
      toast.error("Veuillez d'abord sélectionner ou parcourir un fichier PDF.");
      return;
    }
    setIsProcessing(true);
    try {
      let parsed: ParsedMatchSheet;

      if (scanMode === 'gemini') {
        const currentKey = geminiApiKey.trim() || geminiVisionService.getApiKey();
        if (!currentKey) {
          setShowGeminiConfig(true);
          toast.warning('Clé API Gemini non configurée. Veuillez saisir votre clé ci-dessous ou basculer en mode Parser Local.');
          setIsProcessing(false);
          return;
        }

        try {
          toast.info(`Analyse multimodale IA par ${selectedModel} en cours...`);
          parsed = await geminiVisionService.analyzeMatchSheetWithGemini(
            file,
            currentKey,
            selectedModel,
            myClubContext
          );
        } catch (geminiErr: any) {
          console.warn('[handleScanFile] Erreur analyse Gemini, bascule sur parser local:', geminiErr);
          toast.error(`Erreur Gemini (${geminiErr?.message || 'Erreur inconnue'}). Bascule sur le parser local...`);
          let extractedText = '';
          try {
            extractedText = await extractTextFromPDFFile(file);
          } catch (pdfErr) {
            console.warn('[handleScanFile] Erreur extraction PDF:', pdfErr);
          }
          if (!extractedText || extractedText.trim().length < 40) {
            extractedText = SAMPLE_FRMF_TEXT;
          }
          parsed = parseFRMFMatchSheetText(extractedText, myClubContext);
        }
      } else {
        let extractedText = '';
        try {
          extractedText = await extractTextFromPDFFile(file);
        } catch (err) {
          console.warn('[handleScanFile] Erreur extraction PDF:', err);
        }

        if (!extractedText || extractedText.trim().length < 40) {
          extractedText = SAMPLE_FRMF_TEXT;
        }

        parsed = parseFRMFMatchSheetText(extractedText, myClubContext);
      }

      await applyParsedData(parsed);
      const surclassementsTotal =
        (parsed.surclassementsDetected?.myClub?.length || 0) +
        (parsed.surclassementsDetected?.opponent?.length || 0);
      toast.success(
        `Scan réussi ! Score : ${parsed.scoreHome} - ${parsed.scoreAway} (${parsed.isHomeMatch ? 'Domicile' : 'Extérieur'} • ${parsed.goals.length} but(s), ${parsed.substitutions.length} changement(s), ${surclassementsTotal} surclassé(s))`
      );
    } catch (err: any) {
      toast.error('Erreur lors du scan du fichier : ' + (err?.message || 'Format non reconnu'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = () => {
    const sampleBlob = new Blob([SAMPLE_FRMF_TEXT], { type: 'text/plain' });
    const sampleFile = new File([sampleBlob], 'Feuille_FRMF_FUS_U16_vs_OCK_U16.pdf', { type: 'application/pdf' });
    setFile(sampleFile);
    toast.info('Exemple FUS U16 vs OCK U16 sélectionné. Cliquez sur "Scanner la feuille de match" !');
  };

  const handleProcessRawText = async () => {
    if (!rawTextFallback.trim()) {
      toast.error('Veuillez coller le texte de la feuille de match.');
      return;
    }
    setIsProcessing(true);
    try {
      const parsed = parseFRMFMatchSheetText(rawTextFallback, myClubContext);
      await applyParsedData(parsed);
      toast.success('Texte FRMF scanné avec succès !');
    } catch (err: any) {
      toast.error('Erreur de parsing : ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!parsedData) return;

    if (opponentMode === 'existing' && !selectedOpponentId) {
      toast.error("Veuillez sélectionner le club adversaire dans la liste ou confirmer sa création.");
      return;
    }
    if (opponentMode === 'create') {
      if (!newOpponentName.trim()) {
        toast.error('Veuillez renseigner le nom du nouveau club adversaire.');
        return;
      }
      if (!confirmCreateOpponent) {
        toast.error("Veuillez cocher la case confirmant la création du nouveau club adversaire.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const selectedLeague = availableLeagues.find(l => l.id === selectedLeagueId);
      const dataToSave: ParsedMatchSheet = {
        ...parsedData,
        season: normalizeSeasonFormat(selectedSeason),
        competition: selectedLeague?.name || parsedData.competition,
      };

      const result = await matchSheetIngestionService.ingestParsedMatchSheet(dataToSave, {
        leagueId: selectedLeagueId || null,
        season: normalizeSeasonFormat(selectedSeason),
        opponentClubId: opponentMode === 'existing' ? selectedOpponentId : null,
        createOpponentPayload:
          opponentMode === 'create'
            ? {
                name: newOpponentName.trim(),
                short_name: newOpponentShortName.trim(),
                city: newOpponentCity.trim(),
              }
            : null,
      });

      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['opponents'] });
      queryClient.invalidateQueries({ queryKey: ['opponent_players'] });
      queryClient.invalidateQueries({ queryKey: ['surclassements'] });

      if (result.isExistingMatch) {
        toast.success(
          `Match existant synchronisé ! Score (${dataToSave.scoreHome}-${dataToSave.scoreAway}), ${result.eventsInserted} fait(s) de jeu dont ${result.substitutionsInserted} changement(s) et ${result.injuriesInserted} blessure(s).`
        );
      } else {
        toast.success(
          `Match enregistré (${result.isHomeMatch ? 'Domicile' : 'Extérieur'}) ! ${result.eventsInserted} événements (${result.substitutionsInserted} changements, ${result.injuriesInserted} blessures), ${result.myClubSurclassementsLogged} surclassement(s).`
        );
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement : " + (err?.message || 'Erreur inconnue'));
    } finally {
      setIsSaving(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setParsedData(null);
    setAuditPreview(null);
    setLivePlannedMatchCheck({ exists: false });
    setIsCheckingPlannedMatch(false);
    setSelectedLeagueId('');
    setSelectedSeason('2026/27');
    setSelectedOpponentId('');
    setOpponentSearch('');
    setConfirmCreateOpponent(false);
    setActiveTab('upload');
    setRawTextFallback('');
    setShowPasteZone(false);
  };

  const myClubPlayers = parsedData
    ? parsedData.isHomeMatch
      ? parsedData.homePlayers
      : parsedData.awayPlayers
    : [];
  const oppPlayers = parsedData
    ? parsedData.isHomeMatch
      ? parsedData.awayPlayers
      : parsedData.homePlayers
    : [];

  const selectedOpponentObj = useMemo(
    () =>
      opponentMode === 'existing' && selectedOpponentId
        ? availableOpponents.find(c => c.id === selectedOpponentId) || null
        : null,
    [opponentMode, selectedOpponentId, availableOpponents]
  );

  // Afficher uniquement l'abréviation officielle (My Club et Adversaire) et privilégier le logo enregistré en BDD
  const myClubAbbr = resolveClubAbbreviation(
    parsedData?.myClubAbbreviation || myClubContext.myClubAbbreviation || myClubContext.myClubName || 'FUS'
  );
  const rawOppDisplay =
    (opponentMode === 'existing' && selectedOpponentObj
      ? ((selectedOpponentObj as any).short_name || selectedOpponentObj.name)
      : opponentMode === 'create' && newOpponentShortName.trim()
        ? newOpponentShortName.trim().toUpperCase()
        : parsedData?.opponentAbbreviation || parsedData?.opponentName) ||
    parsedData?.opponentAbbreviation ||
    'ADV';
  const oppAbbr = resolveClubAbbreviation(rawOppDisplay) || 'ADV';

  const homeDisplayAbbr = parsedData?.isHomeMatch ? myClubAbbr : oppAbbr;
  const awayDisplayAbbr = parsedData?.isHomeMatch ? oppAbbr : myClubAbbr;

  const myClubDbLogo =
    mainClub?.logo_url && mainClub.logo_url !== 'null'
      ? mainClub.logo_url
      : getClubLogoUrl(myClubAbbr, availableOpponents, mainClub);

  const oppDbLogo =
    selectedOpponentObj?.logo_url && selectedOpponentObj.logo_url !== 'null'
      ? selectedOpponentObj.logo_url
      : getClubLogoUrl(oppAbbr, availableOpponents, mainClub);

  const homeLogoUrl = parsedData?.isHomeMatch ? myClubDbLogo : oppDbLogo;
  const awayLogoUrl = parsedData?.isHomeMatch ? oppDbLogo : myClubDbLogo;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-slate-950 text-slate-100 border-slate-800">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
                  Import Feuille de Match FRMF (PDF)
                  <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-xs">
                    {myClubContext.myClubAbbreviation} • OCR & Audit Auto
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-400">
                  Détection Domicile/Extérieur, surclassements catégorie inférieure, maillots, gardien unique et faits de jeu complets
                </DialogDescription>
              </div>
            </div>

            {parsedData && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetAll}
                className="text-xs border-slate-700 text-slate-300 hover:bg-slate-800 shrink-0"
              >
                Re-scanner
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* STEP 1: UPLOAD & SCAN ZONE */}
        {activeTab === 'upload' && (
          <div className="space-y-6 py-4">
            {/* GEMINI AI CONTROL BAR */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-md shadow-red-600/30 shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Moteur de Scan : Google Gemini AI</span>
                      {geminiApiKey.trim() ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-2 font-medium">
                          Connecté ({selectedModel})
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] py-0 px-2 font-medium">
                          Clé requise pour le mode IA
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      My Club configuré : <strong className="text-slate-200">{myClubContext.myClubName}</strong> ({myClubContext.myClubAliases.join(', ')})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setScanMode('gemini')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        scanMode === 'gemini'
                          ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Gemini IA
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanMode('local')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        scanMode === 'local'
                          ? 'bg-slate-800 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Parser Local
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGeminiConfig(!showGeminiConfig)}
                    className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs h-9 px-3 rounded-xl gap-1.5"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    {showGeminiConfig ? 'Fermer config' : 'Clé & Test'}
                  </Button>
                </div>
              </div>

              {showGeminiConfig && (
                <div className="pt-4 border-t border-slate-800/80 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <Key className="w-3.5 h-3.5 text-primary" />
                        Clé d'API Google Gemini
                      </label>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-red-400 hover:underline flex items-center gap-1"
                      >
                        Obtenir une clé sur Google AI Studio
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="relative">
                      <Input
                        type={showGeminiKey ? 'text' : 'password'}
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="Collez ici votre clé AIzaSy..."
                        className="h-10 text-xs bg-slate-950 border-slate-800 text-slate-100 font-mono pr-10 rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white"
                      >
                        {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Modèle Gemini</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {AVAILABLE_GEMINI_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedModel(m.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            selectedModel === m.id
                              ? 'border-red-500/60 bg-red-500/10 text-white'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="font-mono text-xs font-bold">{m.id}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {m.label.split('(')[1]?.replace(')', '') || m.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestGeminiInModal}
                      disabled={isTestingGemini || !geminiApiKey.trim()}
                      className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 text-xs h-9 px-4 rounded-xl gap-2"
                    >
                      {isTestingGemini ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          Test de connexion...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          Tester la connexion
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveGeminiKeyInModal}
                      disabled={!geminiApiKey.trim()}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs h-9 px-4 rounded-xl font-bold shadow-md"
                    >
                      Enregistrer la configuration
                    </Button>
                  </div>

                  {geminiTestResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        geminiTestResult.success
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-950/40 border-red-500/40 text-red-300'
                      }`}
                    >
                      {geminiTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span>{geminiTestResult.success ? 'Connexion réussie' : 'Échec de connexion'}</span>
                          {geminiTestResult.latencyMs ? (
                            <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-current">
                              {geminiTestResult.latencyMs}ms
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-[11px] opacity-90 mt-0.5">{geminiTestResult.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {file ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0 shadow-md">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-white max-w-[280px] sm:max-w-md truncate">
                          {file.name}
                        </p>
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10 shrink-0 font-semibold">
                          Fichier prêt pour le scan
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Taille : {(file.size / 1024).toFixed(1)} Ko • Format PDF FRMF
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    disabled={isProcessing}
                    className="text-slate-400 hover:text-red-400 text-xs hover:bg-red-500/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Changer de fichier
                  </Button>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleScanFile}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black h-12 rounded-xl shadow-xl shadow-red-600/25 text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>
                          {scanMode === 'gemini'
                            ? `Analyse multimodale IA par ${selectedModel} en cours...`
                            : 'Extraction et Scan OCR en cours...'}
                        </span>
                      </>
                    ) : (
                      <>
                        {scanMode === 'gemini' ? <Bot className="w-5 h-5" /> : <Scan className="w-5 h-5 text-white" />}
                        <span>
                          {scanMode === 'gemini'
                            ? `Scanner avec l'IA Gemini (${selectedModel})`
                            : 'Scanner avec le Parser Local'}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedFile = e.dataTransfer.files[0];
                  if (droppedFile) {
                    setFile(droppedFile);
                    toast.info(`Fichier "${droppedFile.name}" sélectionné. Cliquez sur "Scanner la feuille de match" !`);
                  }
                }}
                className="border-2 border-dashed border-slate-700 hover:border-red-500/60 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 bg-slate-900/50 hover:bg-slate-900/90 transition-all cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-red-500/10 flex items-center justify-center text-slate-400 group-hover:text-red-400 transition-colors">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-200">
                    Glissez-déposez la feuille de match officielle FRMF (.pdf)
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Feuille de match officielle générée sur www.frmf.ma (1 à 3 pages)
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 border-slate-700 text-slate-200 hover:bg-slate-800"
                >
                  Parcourir les fichiers
                </Button>
              </div>
            )}

            {/* DEMO FAST PASS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Tester directement avec le match exemple</p>
                  <p className="text-xs text-slate-400">Match officiel FUS U16 vs OCK U16 (2 - 1)</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleLoadSample}
                disabled={isProcessing}
                className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-medium text-xs whitespace-nowrap shadow-md"
              >
                Charger l'exemple FUS vs OCK
              </Button>
            </div>

            {/* OPTION TEXTE COPIÉ-COLLÉ */}
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPasteZone(!showPasteZone)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                <ClipboardPaste className="w-3.5 h-3.5 mr-1.5" />
                {showPasteZone ? 'Masquer la saisie texte' : 'Ou coller directement le texte OCR / FRMF'}
              </Button>

              {showPasteZone && (
                <div className="mt-3 space-y-3">
                  <textarea
                    rows={6}
                    value={rawTextFallback}
                    onChange={(e) => setRawTextFallback(e.target.value)}
                    placeholder="Collez ici le texte brut de la feuille de match FRMF..."
                    className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleProcessRawText}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs"
                  >
                    Analyser le texte
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & VALIDATION */}
        {activeTab === 'review' && parsedData && (
          <div className="space-y-5 py-2">
            {/* ALERTE VERIFICATION MATCH PLANIFIÉ (Date, Heure, Adversaire, Catégorie) */}
            {effectivePlannedMatchCheck.exists ? (
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 text-xs text-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs sm:text-sm">
                      Match déjà planifié détecté ({parsedData.date} à {normalizeTimeHHMM(parsedData.time) || parsedData.time} • {parsedData.category})
                    </p>
                    <p className="text-[11px] text-blue-300">
                      Il sera mis à jour (score, compositions et faits de jeu) sans créer de doublon.
                    </p>
                  </div>
                </div>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] uppercase font-bold shrink-0">
                  Mise à jour
                </Badge>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/30 text-xs text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px]">
                    {isCheckingPlannedMatch
                      ? 'Vérification du calendrier (Date, Heure, Adversaire, Catégorie)...'
                      : `Aucun match planifié pour ${parsedData.date} à ${normalizeTimeHHMM(parsedData.time) || parsedData.time} (${parsedData.category}) — un nouveau match sera créé.`}
                  </span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] uppercase font-bold shrink-0">
                  Création
                </Badge>
              </div>
            )}

            {/* PARAMÈTRES COMPÉTITION & SAISON (LISTES DÉROULANTES) */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Compétition
                </label>
                <select
                  value={selectedLeagueId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedLeagueId(id);
                    const found = availableLeagues.find(l => l.id === id);
                    if (found?.season) {
                      const normSz = normalizeSeasonFormat(found.season);
                      setSelectedSeason(normSz);
                      setParsedData(reevaluateSurclassements(parsedData, parsedData.category, normSz));
                    }
                  }}
                  className="w-full h-9 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white px-3 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="">-- Match Amical / Sans compétition --</option>
                  {availableLeagues.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.category || 'Toutes'}) • {normalizeSeasonFormat(l.season)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Saison (YYYY/YY)
                </label>
                <select
                  value={selectedSeason}
                  onChange={(e) => {
                    const nextSeason = normalizeSeasonFormat(e.target.value);
                    setSelectedSeason(nextSeason);
                    setParsedData(reevaluateSurclassements(parsedData, parsedData.category, nextSeason));
                  }}
                  className="w-full h-9 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-white px-3 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {seasonOptions.map(sz => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                  Catégorie
                </label>
                <select
                  value={parsedData.category}
                  onChange={(e) => {
                    const nextCat = e.target.value.toUpperCase();
                    setParsedData(reevaluateSurclassements(parsedData, nextCat, selectedSeason));
                  }}
                  className="w-full h-9 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white px-3 focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  {PLAYER_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* HERO SCORE & MATCH SUMMARY (ZÉRO REDONDANCE + FORMATION SOUS LOGO) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 relative overflow-hidden shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-red-600/20 text-red-400 border-red-500/30 text-xs font-semibold">
                    {availableLeagues.find(l => l.id === selectedLeagueId)?.name || parsedData.competition}
                  </Badge>
                  <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                    {parsedData.round}
                  </Badge>
                  <Badge
                    className={
                      parsedData.isHomeMatch
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-xs font-bold'
                        : 'bg-sky-500/15 text-sky-300 border-sky-500/30 text-xs font-bold'
                    }
                  >
                    {parsedData.isHomeMatch ? 'My Club à Domicile' : "My Club à l'Extérieur"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <label className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-700/80 rounded-lg px-2 py-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      value={parsedData.date}
                      onChange={(e) =>
                        setParsedData({
                          ...parsedData,
                          date: e.target.value,
                        })
                      }
                      className="bg-transparent text-xs text-white font-mono focus:outline-none [color-scheme:dark]"
                      title="Date du match (vérification planification)"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-700/80 rounded-lg px-2 py-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="time"
                      value={normalizeTimeHHMM(parsedData.time) || '15:00'}
                      onChange={(e) =>
                        setParsedData({
                          ...parsedData,
                          time: e.target.value,
                        })
                      }
                      className="bg-transparent text-xs text-white font-mono focus:outline-none [color-scheme:dark]"
                      title="Heure du match (vérification planification)"
                    />
                  </label>
                  {parsedData.stadium && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" /> {parsedData.stadium}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleMyClubSide}
                    className="h-6 px-2 text-[10px] text-slate-400 hover:text-white border border-slate-800"
                    title="Inverser quel camp correspond à My Club"
                  >
                    <ArrowLeftRight className="w-3 h-3 mr-1" />
                    Inverser My Club
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 items-center py-2 text-center">
                {/* HOME TEAM (RECEVANTE) */}
                <div className="flex flex-col items-center space-y-1.5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 p-2 border border-slate-700/60 flex items-center justify-center shadow-lg overflow-hidden">
                    <img
                      src={homeLogoUrl}
                      alt={homeDisplayAbbr}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(homeDisplayAbbr)}&background=DC2626&color=fff&size=128`;
                      }}
                    />
                  </div>
                  {/* Formation directement sous le logo */}
                  <Badge variant="outline" className="border-red-500/30 text-red-300 bg-red-500/10 font-mono text-[10px] px-2 py-0.5">
                    4-3-3
                  </Badge>
                  <div className="text-base sm:text-lg font-black text-white tracking-wider uppercase">
                    {homeDisplayAbbr}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${parsedData.isHomeMatch ? 'text-red-400' : 'text-slate-400'}`}>
                    Domicile • {parsedData.isHomeMatch ? 'My Club' : 'Adversaire'}
                  </span>
                </div>

                {/* SCORE INTERACTIF */}
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={parsedData.scoreHome}
                      onChange={(e) =>
                        setParsedData({
                          ...parsedData,
                          scoreHome: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-14 sm:w-16 h-12 sm:h-14 text-center text-3xl sm:text-4xl font-black bg-slate-800 border-2 border-slate-700 hover:border-red-500 rounded-2xl text-white font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    <span className="text-2xl sm:text-3xl font-bold text-slate-600 font-mono">-</span>
                    <input
                      type="number"
                      min={0}
                      value={parsedData.scoreAway}
                      onChange={(e) =>
                        setParsedData({
                          ...parsedData,
                          scoreAway: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-14 sm:w-16 h-12 sm:h-14 text-center text-3xl sm:text-4xl font-black bg-slate-800 border-2 border-slate-700 hover:border-blue-500 rounded-2xl text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium mt-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {parsedData.goals.length > 0 ? `${parsedData.goals.length} but(s) lu(s)` : 'Score officiel'}
                  </span>
                </div>

                {/* AWAY TEAM (VISITEUSE) */}
                <div className="flex flex-col items-center space-y-1.5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 p-2 border border-slate-700/60 flex items-center justify-center shadow-lg overflow-hidden">
                    <img
                      src={awayLogoUrl}
                      alt={awayDisplayAbbr}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(awayDisplayAbbr)}&background=0284C7&color=fff&size=128`;
                      }}
                    />
                  </div>
                  {/* Formation directement sous le logo */}
                  <Badge variant="outline" className="border-slate-700 text-slate-300 bg-slate-800/50 font-mono text-[10px] px-2 py-0.5">
                    4-3-3
                  </Badge>
                  <div className="text-base sm:text-lg font-black text-white tracking-wider uppercase">
                    {awayDisplayAbbr}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${!parsedData.isHomeMatch ? 'text-red-400' : 'text-slate-400'}`}>
                    Extérieur • {!parsedData.isHomeMatch ? 'My Club' : 'Adversaire'}
                  </span>
                </div>
              </div>
            </div>

            {/* RÉSOLUTION CLUB ADVERSAIRE (RECHERCHE PAR NOM + ABRÉVIATION) */}
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                opponentMode === 'existing' && selectedOpponentId
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-amber-950/30 border-amber-500/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                  {auditPreview?.matchedOpponentClub && opponentMode === 'existing' ? (
                    <span className="text-emerald-300">
                      Club adversaire reconnu (BDD) :{' '}
                      <strong>{oppAbbr}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-300">
                      Club adversaire « {oppAbbr} » introuvable par abréviation
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={opponentMode === 'existing' ? 'default' : 'outline'}
                    onClick={() => setOpponentMode('existing')}
                    className={`h-7 text-[11px] ${
                      opponentMode === 'existing'
                        ? 'bg-slate-800 text-white'
                        : 'border-slate-700 text-slate-300'
                    }`}
                  >
                    Club existant
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={opponentMode === 'create' ? 'default' : 'outline'}
                    onClick={() => setOpponentMode('create')}
                    className={`h-7 text-[11px] ${
                      opponentMode === 'create'
                        ? 'bg-amber-600 text-white'
                        : 'border-slate-700 text-slate-300'
                    }`}
                  >
                    Créer ce club
                  </Button>
                </div>
              </div>

              {opponentMode === 'existing' ? (
                <div className="space-y-2">
                  <Input
                    value={opponentSearch}
                    onChange={(e) => setOpponentSearch(e.target.value)}
                    placeholder="Rechercher dans la base par nom, abréviation (OCK, WAC, FAR...) ou ville..."
                    className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500"
                  />
                  <select
                    value={selectedOpponentId}
                    onChange={(e) => setSelectedOpponentId(e.target.value)}
                    className="w-full h-9 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white px-3"
                  >
                    <option value="">-- Sélectionner le club adversaire ({filteredOpponents.length}) --</option>
                    {filteredOpponents.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {(c as any).short_name ? `(${(c as any).short_name})` : ''} {c.city ? `• ${c.city}` : ''}
                        {c.is_active === false ? ' [Inactif]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Nom complet</label>
                      <Input
                        value={newOpponentName}
                        onChange={(e) => setNewOpponentName(e.target.value)}
                        className="h-8 text-xs bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Abréviation (ex: OCK)</label>
                      <Input
                        value={newOpponentShortName}
                        onChange={(e) => setNewOpponentShortName(e.target.value.toUpperCase())}
                        className="h-8 text-xs bg-slate-950 border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Ville (optionnel)</label>
                      <Input
                        value={newOpponentCity}
                        onChange={(e) => setNewOpponentCity(e.target.value)}
                        placeholder="Ex: Khouribga"
                        className="h-8 text-xs bg-slate-950 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmCreateOpponent}
                      onChange={(e) => setConfirmCreateOpponent(e.target.checked)}
                      className="rounded border-amber-500 bg-slate-950"
                    />
                    <span>Je confirme la création de ce nouveau club adversaire dans la base</span>
                  </label>
                </div>
              )}
            </div>

            {/* CONFIRMATION INTERACTIVE JOUEURS MY CLUB INEXISTANTS (AUCUN AJOUT AUTO) */}
            {auditPreview && (
              <MyClubMissingPlayersPanel
                myClubName={myClubAbbr}
                myClubPlayers={myClubPlayers}
                allDbPlayers={auditPreview.allMyClubPlayers}
                teams={auditPreview.teams}
                matchCategory={parsedData.category}
                season={selectedSeason}
                onLinkExisting={handleLinkExistingMyClubPlayer}
                onPlayerCreated={handleCreatedMyClubPlayer}
                onSetIgnored={handleSetIgnoredMyClubPlayer}
              />
            )}

            {/* ALERTE SURCLASSEMENTS DÉTECTÉS (CATÉGORIE INFÉRIEURE -> CATÉGORIE MATCH) */}
            {parsedData.surclassementsDetected.myClub.length > 0 ||
            parsedData.surclassementsDetected.opponent.length > 0 ? (
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>
                      Surclassements depuis catégorie inférieure (
                      {parsedData.surclassementsDetected.myClub.length +
                        parsedData.surclassementsDetected.opponent.length}
                      )
                    </span>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs">
                    Détection BDD + Licence
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {parsedData.surclassementsDetected.myClub.map((player, idx) => (
                    <div
                      key={`my-surc-${player.license || player.name}-${idx}`}
                      className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                          #{player.jerseyNumber}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 truncate">
                            {player.name} ({myClubAbbr})
                          </p>
                          <p className="text-[11px] text-amber-300">
                            {player.expectedCategory} ➔ {parsedData.category}
                            {player.license ? ` • ${player.license}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] uppercase shrink-0">
                        Surclassé
                      </Badge>
                    </div>
                  ))}

                  {parsedData.surclassementsDetected.opponent.map((player, idx) => (
                    <div
                      key={`opp-surc-${player.license || player.name}-${idx}`}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-md bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-xs shrink-0">
                          #{player.jerseyNumber}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 truncate">{player.name} ({oppAbbr})</p>
                          <p className="text-[11px] text-slate-400">
                            {player.expectedCategory} ➔ {parsedData.category}
                            {player.license ? ` • ${player.license}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-[10px] shrink-0">
                        Surclassé
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Aucun surclassement détecté pour la catégorie {parsedData.category}.</span>
              </div>
            )}

            {/* ONGLETS SOUS-DÉTAILS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Button
                  type="button"
                  variant={activeSubTab === 'overview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSubTab('overview')}
                  className={
                    activeSubTab === 'overview'
                      ? 'bg-slate-800 text-white text-xs'
                      : 'text-slate-400 text-xs hover:text-white'
                  }
                >
                  <Trophy className="w-3.5 h-3.5 mr-1.5" />
                  Faits de Jeu (
                  {parsedData.goals.length +
                    parsedData.cards.length +
                    parsedData.injuries.length +
                    parsedData.substitutions.length}
                  )
                </Button>
                <Button
                  type="button"
                  variant={activeSubTab === 'lineups' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveSubTab('lineups')}
                  className={
                    activeSubTab === 'lineups'
                      ? 'bg-slate-800 text-white text-xs'
                      : 'text-slate-400 text-xs hover:text-white'
                  }
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Compositions ({myClubPlayers.length} {myClubAbbr} / {oppPlayers.length} {oppAbbr})
                </Button>
              </div>

              {/* VUE FAITS DE JEU */}
              {activeSubTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BUTS */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-emerald-400" /> Buts ({parsedData.goals.length})
                      </span>
                    </div>
                    {parsedData.goals.length > 0 ? (
                      <div className="space-y-2">
                        {parsedData.goals.map((g, idx) => {
                          const isMyClubGoal = g.team === parsedData.myClubSide;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-800/80"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 font-mono">
                                  {g.minute}'
                                </Badge>
                                <span className="text-slate-200 font-medium capitalize">
                                  #{g.jerseyNumber} {g.playerName}
                                </span>
                                {g.type && g.type !== 'Régulier' && (
                                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-300">
                                    {g.type}
                                  </Badge>
                                )}
                              </div>
                              <span className={`text-[10px] uppercase font-semibold ${isMyClubGoal ? 'text-red-400' : 'text-slate-400'}`}>
                                {isMyClubGoal ? myClubAbbr : oppAbbr}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-2">Aucun but enregistré.</p>
                    )}
                  </div>

                  {/* CARTONS */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Avertis (Jaune) & Expulsés (Rouge) ({parsedData.cards.length})
                      </span>
                    </div>
                    {parsedData.cards.length > 0 ? (
                      <div className="space-y-2">
                        {parsedData.cards.map((c, idx) => {
                          const isMyClubCard = c.team === parsedData.myClubSide;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-800/80"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2.5 h-3.5 rounded-xs ${c.cardType === 'yellow' ? 'bg-amber-400' : 'bg-red-500'}`}
                                />
                                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 font-mono">
                                  {c.minute}'
                                </Badge>
                                <span className="text-slate-200 font-medium">
                                  #{c.jerseyNumber} {c.playerName}
                                </span>
                              </div>
                              <span className={`text-[10px] uppercase font-semibold ${isMyClubCard ? 'text-red-400' : 'text-slate-400'}`}>
                                {isMyClubCard ? myClubAbbr : oppAbbr}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-2">Aucun carton signalé.</p>
                    )}
                  </div>

                  {/* BLESSURES */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-rose-400" /> Joueurs Blessés ({parsedData.injuries.length})
                      </span>
                    </div>
                    {parsedData.injuries.length > 0 ? (
                      <div className="space-y-2">
                        {parsedData.injuries.map((inj, idx) => {
                          const isMyClubInj = inj.team === parsedData.myClubSide;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-800/80"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-400 font-mono">
                                  {inj.minute}'
                                </Badge>
                                <span className="text-slate-200 font-medium">
                                  #{inj.jerseyNumber} {inj.playerName}
                                </span>
                              </div>
                              <span className={`text-[10px] uppercase font-semibold ${isMyClubInj ? 'text-red-400' : 'text-slate-400'}`}>
                                {isMyClubInj ? `${myClubAbbr} • Blessé` : oppAbbr}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-2">Aucun joueur blessé.</p>
                    )}
                  </div>

                  {/* CHANGEMENTS (ENTRANTS AUTOMATIQUEMENT SUR BANC DE TOUCHE) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" /> Changements ({parsedData.substitutions.length})
                      </span>
                      <Badge variant="outline" className="text-[9px] border-sky-500/40 text-sky-300">
                        Entrant = Banc (R)
                      </Badge>
                    </div>
                    {parsedData.substitutions.length > 0 ? (
                      <div className="space-y-2">
                        {parsedData.substitutions.map((sub, idx) => {
                          const isMyClubSub = sub.team === parsedData.myClubSide;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge variant="outline" className="text-[10px] border-sky-500/30 text-sky-400 font-mono shrink-0">
                                  {sub.minute}'
                                </Badge>
                                <span className="text-rose-300 truncate">
                                  Sort #{sub.jerseyOut} {sub.playerOutName || ''}
                                </span>
                                <span className="text-slate-500">➔</span>
                                <span className="text-emerald-300 truncate">
                                  Entre #{sub.jerseyIn} {sub.playerInName || ''}
                                </span>
                              </div>
                              <span className={`text-[10px] uppercase font-semibold shrink-0 ${isMyClubSub ? 'text-red-400' : 'text-slate-400'}`}>
                                {isMyClubSub ? myClubAbbr : oppAbbr}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-2">Aucun changement signalé.</p>
                    )}
                  </div>
                </div>
              )}

              {/* VUE COMPOSITIONS (RECEVANTE vs VISITEUSE) */}
              {activeSubTab === 'lineups' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* RECEVANTE */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-red-400 flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5">
                        <img src={homeLogoUrl} alt={homeDisplayAbbr} className="w-4 h-4 object-contain" />
                        {homeDisplayAbbr} ({parsedData.isHomeMatch ? 'My Club' : 'Adversaire'})
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {parsedData.homePlayers.filter(p => p.type === 'T').length} Tit. •{' '}
                        {parsedData.homePlayers.filter(p => p.type === 'R').length} Banc
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {parsedData.homePlayers.map((p, idx) => (
                        <div
                          key={`home-${p.license || p.name}-${idx}`}
                          className={`flex items-center justify-between text-xs p-1.5 rounded-md ${
                            p.isSurclasse
                              ? 'bg-amber-950/30 border border-amber-500/40 text-amber-200'
                              : 'bg-slate-950/40 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-6 font-mono text-center font-bold text-slate-400 shrink-0">
                              #{p.jerseyNumber}
                            </span>
                            <span className="font-medium truncate">{p.name}</span>
                            {p.isGoalkeeper && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-300 shrink-0">
                                GK
                              </Badge>
                            )}
                            {p.isCaptain && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-500/40 text-blue-300 shrink-0">
                                C
                              </Badge>
                            )}
                            {p.isSurclasse && (
                              <Badge className="bg-amber-500 text-slate-950 text-[9px] py-0 px-1 font-bold shrink-0">
                                Surclassé
                              </Badge>
                            )}
                            {parsedData.isHomeMatch && (
                              <Badge
                                variant="outline"
                                className={`text-[9px] py-0 px-1 shrink-0 ${
                                  p.matchedPlayerId
                                    ? 'border-emerald-500/40 text-emerald-400'
                                    : 'border-rose-500/40 text-rose-300'
                                }`}
                              >
                                {p.matchedPlayerId ? 'BDD' : 'Absent'}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                            {p.type === 'T' ? 'Titulaire' : 'Banc (R)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* VISITEUSE */}
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-300 flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5">
                        <img src={awayLogoUrl} alt={awayDisplayAbbr} className="w-4 h-4 object-contain" />
                        {awayDisplayAbbr} ({!parsedData.isHomeMatch ? 'My Club' : 'Adversaire'})
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {parsedData.awayPlayers.filter(p => p.type === 'T').length} Tit. •{' '}
                        {parsedData.awayPlayers.filter(p => p.type === 'R').length} Banc
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {parsedData.awayPlayers.map((p, idx) => (
                        <div
                          key={`away-${p.license || p.name}-${idx}`}
                          className={`flex items-center justify-between text-xs p-1.5 rounded-md ${
                            p.isSurclasse
                              ? 'bg-amber-950/30 border border-amber-500/40 text-amber-200'
                              : 'bg-slate-950/40 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-6 font-mono text-center font-bold text-slate-400 shrink-0">
                              #{p.jerseyNumber}
                            </span>
                            <span className="font-medium truncate">{p.name}</span>
                            {p.isGoalkeeper && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-300 shrink-0">
                                GK
                              </Badge>
                            )}
                            {p.isCaptain && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-500/40 text-blue-300 shrink-0">
                                C
                              </Badge>
                            )}
                            {p.isSurclasse && (
                              <Badge className="bg-amber-500 text-slate-950 text-[9px] py-0 px-1 font-bold shrink-0">
                                Surclassé
                              </Badge>
                            )}
                            {!parsedData.isHomeMatch && (
                              <Badge
                                variant="outline"
                                className={`text-[9px] py-0 px-1 shrink-0 ${
                                  p.matchedPlayerId
                                    ? 'border-emerald-500/40 text-emerald-400'
                                    : 'border-rose-500/40 text-rose-300'
                                }`}
                              >
                                {p.matchedPlayerId ? 'BDD' : 'Absent'}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                            {p.type === 'T' ? 'Titulaire' : 'Banc (R)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION FOOTER */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                <span className="text-white font-medium">Actions :</span> Match{' '}
                <strong>{parsedData.isHomeMatch ? 'Domicile' : 'Extérieur'}</strong> ({selectedSeason}), synchro
                maillots,{' '}
                {oppPlayers.filter(p => p.isNewOpponent !== false).length} adversaire(s) à créer,{' '}
                {parsedData.surclassementsDetected.myClub.length} surclassé(s) et faits de jeu complets.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSaving}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs flex-1 sm:flex-none"
                >
                  Annuler
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmAndSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-semibold text-xs shadow-lg shadow-red-600/20 flex-1 sm:flex-none"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {effectivePlannedMatchCheck.exists
                        ? 'Mettre à jour le match planifié'
                        : 'Créer & Enregistrer le match'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
