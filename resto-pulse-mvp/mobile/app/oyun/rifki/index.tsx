import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RifkiArenaScene } from '@/components/rifki/RifkiArenaScene';
import { RifkiGrid } from '@/components/rifki/RifkiGrid';
import { RifkiHeader } from '@/components/rifki/RifkiHeader';
import { RIFKI_THEME } from '@/constants/rifki';
import { RIFKI_ANIM } from '@/constants/rifki-anim';
import { useSession } from '@/context/session-context';
import { isExpoGo } from '@/lib/google-signin-config';
import {
  createEnemy,
  getRespawnDelay,
  hasEnemyCaughtRifki,
  isEnemyDead,
  moveEnemyCloser,
  pushEnemyBack,
  type EnemyState,
} from '@/lib/rifki/enemyEngine';
import { getLevelConfig } from '@/lib/rifki/levelConfig';
import {
  buildGravityAnimMap,
  buildMatchAnimMap,
  buildShakeAnimMap,
  buildStoneFallAnimMap,
  mergeAnimMaps,
  type TileAnimMap,
} from '@/lib/rifki/gridAnimHelpers';
import {
  createGrid,
  findMatches,
  hasAnyValidMove,
  isStoneTile,
  isValidSwap,
  removeMatches,
  shuffleGridWithValidMoves,
  swapTiles,
  type BoardCascade,
  type Grid,
  type TileColor,
} from '@/lib/rifki/matchEngine';
import { tilesAtPositions, uniqueBlastCells } from '@/lib/rifki/powerEngine';
import {
  clampMaterialVolume,
  ENEMY_MOVE_MATERIAL_GAIN,
  enemySpawnMaterialVolume,
  findNewStoneIds,
  isMaterialRelief,
  materialPressureRatio,
  MATERIAL_VOLUME_MAX,
} from '@/lib/rifki/stoneEngine';
import {
  resolveGcTekBlast,
  resolveSwapWithPowers,
} from '@/lib/rifki/turnEngine';

type GameStatus = 'playing' | 'level_complete' | 'game_over_moves' | 'game_over_enemy';

const DOUBLE_TAP_MS = 320;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function targetsMet(
  targetMatches: { color: TileColor; count: number }[] | undefined,
  matchedColors: Partial<Record<TileColor, number>>,
): boolean {
  if (!targetMatches?.length) return true;
  return targetMatches.every((target) => (matchedColors[target.color] ?? 0) >= target.count);
}

export default function RifkiGameScreen() {
  const router = useRouter();
  const { user } = useSession();
  const t = RIFKI_THEME;
  const { t: tr } = useTranslation();

  const [currentLevel, setCurrentLevel] = useState(1);
  const [grid, setGrid] = useState<Grid>(() => createGrid());
  const [selectedTile, setSelectedTile] = useState<{ row: number; col: number } | null>(null);
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(() => getLevelConfig(1).maxMoves);
  const [matchedColors, setMatchedColors] = useState<Partial<Record<TileColor, number>>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [enemy, setEnemy] = useState<EnemyState | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [banner, setBanner] = useState<string | null>(null);
  const [devBypassAuth, setDevBypassAuth] = useState(__DEV__ && isExpoGo);
  const [tileAnimMap, setTileAnimMap] = useState<TileAnimMap>({});
  const [enemySpawnToken, setEnemySpawnToken] = useState(0);
  const [enemyPushToken, setEnemyPushToken] = useState(0);
  const [enemyDying, setEnemyDying] = useState(false);
  const [materialVolume, setMaterialVolume] = useState(0);
  const [materialDrainToken, setMaterialDrainToken] = useState(0);

  const materialVolumeRef = useRef(materialVolume);
  materialVolumeRef.current = materialVolume;

  const canPlay = Boolean(user) || (__DEV__ && isExpoGo && devBypassAuth);
  const { width: windowWidth } = useWindowDimensions();

  useEffect(() => {
    if (__DEV__ && isExpoGo) {
      setDevBypassAuth(true);
    }
  }, []);

  const levelConfig = useMemo(() => getLevelConfig(currentLevel), [currentLevel]);

  const isAnimatingRef = useRef(isAnimating);
  const gameStatusRef = useRef(gameStatus);
  const enemyRef = useRef(enemy);
  const spawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const respawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTapRef = useRef<{ row: number; col: number; time: number } | null>(null);

  isAnimatingRef.current = isAnimating;
  gameStatusRef.current = gameStatus;
  enemyRef.current = enemy;

  const clearEnemyTimers = useCallback(() => {
    if (spawnTimeoutRef.current) {
      clearTimeout(spawnTimeoutRef.current);
      spawnTimeoutRef.current = null;
    }
    if (respawnTimeoutRef.current) {
      clearTimeout(respawnTimeoutRef.current);
      respawnTimeoutRef.current = null;
    }
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  }, []);

  const scheduleEnemyRespawn = useCallback(() => {
    if (respawnTimeoutRef.current) clearTimeout(respawnTimeoutRef.current);
    respawnTimeoutRef.current = setTimeout(() => {
      if (gameStatusRef.current !== 'playing') return;
      setEnemy(createEnemy(currentLevel));
      setEnemySpawnToken((token) => token + 1);
      setEnemyDying(false);
      setMaterialVolume(enemySpawnMaterialVolume(7));
    }, getRespawnDelay(currentLevel));
  }, [currentLevel]);

  const killEnemyWithAnimation = useCallback(async () => {
    setEnemyDying(true);
    await delay(RIFKI_ANIM.enemyDeathMs);
    setEnemy(null);
    setEnemyDying(false);
    scheduleEnemyRespawn();
  }, [scheduleEnemyRespawn]);

  const resetLevel = useCallback(
    (level: number) => {
      clearEnemyTimers();
      const config = getLevelConfig(level);
      setCurrentLevel(level);
      setGrid(createGrid());
      setSelectedTile(null);
      setScore(0);
      setMovesLeft(config.maxMoves);
      setMatchedColors({});
      setIsAnimating(false);
      setEnemy(null);
      setGameStatus('playing');
      setBanner(null);
      setTileAnimMap({});
      setEnemySpawnToken(0);
      setEnemyPushToken(0);
      setEnemyDying(false);
      setMaterialVolume(0);
      setMaterialDrainToken(0);

      spawnTimeoutRef.current = setTimeout(() => {
        if (gameStatusRef.current !== 'playing') return;
        setEnemy(createEnemy(level));
        setEnemySpawnToken((token) => token + 1);
        setMaterialVolume(enemySpawnMaterialVolume(7));
      }, config.enemyConfig.firstSpawnDelayMs);
    },
    [clearEnemyTimers],
  );

  useEffect(() => {
    return () => clearEnemyTimers();
  }, [clearEnemyTimers]);

  useEffect(() => {
    if (gameStatus !== 'playing' || enemy) return;
    const config = getLevelConfig(currentLevel);
    if (spawnTimeoutRef.current) return;

    spawnTimeoutRef.current = setTimeout(() => {
      spawnTimeoutRef.current = null;
      if (gameStatusRef.current !== 'playing') return;
      setEnemy(createEnemy(currentLevel));
      setEnemySpawnToken((token) => token + 1);
      setMaterialVolume(enemySpawnMaterialVolume(7));
    }, config.enemyConfig.firstSpawnDelayMs);

    return () => {
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
        spawnTimeoutRef.current = null;
      }
    };
  }, [currentLevel, enemy, gameStatus]);

  useEffect(() => {
    if (!enemy || gameStatus !== 'playing') {
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
        moveIntervalRef.current = null;
      }
      return;
    }

    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);

    moveIntervalRef.current = setInterval(() => {
      if (isAnimatingRef.current || gameStatusRef.current !== 'playing') return;

      setEnemy((prev) => {
        if (!prev || prev.isAnimating) return prev;
        const next = moveEnemyCloser(prev);
        if (hasEnemyCaughtRifki(next)) {
          setGameStatus('game_over_enemy');
        }
        setMaterialVolume((volume) => clampMaterialVolume(volume + ENEMY_MOVE_MATERIAL_GAIN));
        return next;
      });
    }, enemy.moveIntervalMs);

    return () => {
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
        moveIntervalRef.current = null;
      }
    };
  }, [enemy, gameStatus]);

  const evaluateOutcome = useCallback(
    (nextScore: number, nextMoves: number, nextMatched: Partial<Record<TileColor, number>>) => {
      const wonScore = nextScore >= levelConfig.targetScore;
      const wonColors = targetsMet(levelConfig.targetMatches, nextMatched);
      if (wonScore && wonColors) {
        setGameStatus('level_complete');
        clearEnemyTimers();
        return;
      }
      if (nextMoves <= 0) {
        setGameStatus('game_over_moves');
        clearEnemyTimers();
      }
    },
    [clearEnemyTimers, levelConfig],
  );

  const applyEnemyFromCascades = useCallback(
    (cascades: BoardCascade[], nextEnemy: typeof enemy) => {
      let enemyState = nextEnemy;
      let enemyWasKilled = false;

      for (let cascadeIndex = 0; cascadeIndex < cascades.length; cascadeIndex++) {
        const cascade = cascades[cascadeIndex]!;
        for (const group of cascade.groups) {
          if (!enemyState) continue;
          const effectiveSize = group.length >= 5 || cascadeIndex >= 1 ? 5 : group.length;
          enemyState = pushEnemyBack(enemyState, effectiveSize);
          setEnemyPushToken((token) => token + 1);
          if (isEnemyDead(enemyState)) enemyWasKilled = true;
        }
      }

      return { enemyState, enemyWasKilled };
    },
    [],
  );

  const playResolvedTurn = useCallback(
    async (params: {
      initialMatches: BoardCascade[number]['groups'];
      prepared: Grid;
      steps: Grid[];
      cascades: BoardCascade[];
      isFlood?: boolean;
    }) => {
      const { initialMatches, prepared, steps, cascades, isFlood = false } = params;

      if (initialMatches.length) {
        setTileAnimMap(buildMatchAnimMap(initialMatches.flat().map((tile) => tile.id)));
        await delay(RIFKI_ANIM.matchMs);
        setTileAnimMap({});
      }

      let working = prepared;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]!;

        if (i > 0) {
          const cascade = cascades[i];
          if (cascade?.groups.length) {
            setTileAnimMap(buildMatchAnimMap(cascade.groups.flat().map((tile) => tile.id)));
            await delay(RIFKI_ANIM.matchMs);
            setTileAnimMap({});
            working = removeMatches(working, cascade.groups);
          }
        }

        const beforeStep = i === 0 ? prepared : working;
        const gravityMap = buildGravityAnimMap(beforeStep, step);
        const stoneFallMap = buildStoneFallAnimMap(findNewStoneIds(beforeStep, step), isFlood && i === 0);
        setTileAnimMap(mergeAnimMaps(gravityMap, stoneFallMap));
        setGrid(step);
        working = step;
        await delay(RIFKI_ANIM.fallSettleMs);
        setTileAnimMap({});
      }

      return working;
    },
    [],
  );

  useEffect(() => {
    if (!enemy || enemyDying) return;
    if (isEnemyDead(enemy)) {
      void killEnemyWithAnimation();
    }
  }, [enemy, enemyDying, killEnemyWithAnimation]);

  const resolveSwap = useCallback(
    async (from: { row: number; col: number }, to: { row: number; col: number }) => {
      setIsAnimating(true);
      setEnemy((prev) => (prev ? { ...prev, isAnimating: true } : prev));

      try {
        const swapped = swapTiles(grid, from.row, from.col, to.row, to.col);
        setGrid(swapped);
        setSelectedTile(null);

        const {
          prepared,
          steps,
          totalScore,
          cascades,
          initialMatches,
          materialVolume: nextMaterialVolume,
          isFlood,
          materialTransferred,
        } = resolveSwapWithPowers(swapped, materialVolumeRef.current);
        setMaterialVolume(nextMaterialVolume);
        if (materialTransferred > 0) {
          setMaterialDrainToken((token) => token + 1);
        }
        if (isFlood) {
          setBanner(tr('eglence.rifki.taslarAkiyor'));
        }
        const nextMatched = { ...matchedColors };

        for (const group of initialMatches) {
          for (const tile of group) {
            nextMatched[tile.color] = (nextMatched[tile.color] ?? 0) + 1;
          }
        }
        for (const cascade of cascades.slice(initialMatches.length ? 1 : 0)) {
          for (const group of cascade.groups) {
            for (const tile of group) {
              nextMatched[tile.color] = (nextMatched[tile.color] ?? 0) + 1;
            }
          }
        }

        let nextEnemy = enemyRef.current;
        const { enemyState, enemyWasKilled } = applyEnemyFromCascades(cascades, nextEnemy);
        nextEnemy = enemyState;

        const finalGrid = await playResolvedTurn({ initialMatches, prepared, steps, cascades, isFlood });

        const nextScore = score + totalScore;
        const nextMoves = movesLeft - 1;

        setScore(nextScore);
        setMovesLeft(nextMoves);
        setMatchedColors(nextMatched);

        if (nextEnemy && enemyWasKilled) {
          setEnemy({ ...nextEnemy, isAnimating: false });
        } else {
          setEnemy(nextEnemy ? { ...nextEnemy, isAnimating: false } : null);
        }

        if (gameStatusRef.current === 'playing' && !hasAnyValidMove(finalGrid)) {
          const shuffled = shuffleGridWithValidMoves(finalGrid);
          setGrid(shuffled);
          setBanner(tr('eglence.rifki.hamleKalmadi'));
        }

        evaluateOutcome(nextScore, nextMoves, nextMatched);
      } finally {
        setIsAnimating(false);
      }
    },
    [applyEnemyFromCascades, evaluateOutcome, grid, matchedColors, movesLeft, playResolvedTurn, score, tr],
  );

  const activateGcTek = useCallback(
    async (row: number, col: number) => {
      const tile = grid[row]?.[col];
      if (!tile || tile.power !== 'GC_TEK') return;

      setIsAnimating(true);
      setEnemy((prev) => (prev ? { ...prev, isAnimating: true } : prev));
      setSelectedTile(null);

      try {
        const {
          prepared,
          steps,
          totalScore,
          cascades,
          materialVolume: nextMaterialVolume,
          isFlood,
          materialTransferred,
        } = resolveGcTekBlast(grid, row, col, materialVolumeRef.current);
        setMaterialVolume(nextMaterialVolume);
        if (materialTransferred > 0) {
          setMaterialDrainToken((token) => token + 1);
        }
        if (isFlood) setBanner(tr('eglence.rifki.taslarAkiyor2'));
        const blastIds = tilesAtPositions(grid, uniqueBlastCells([{ row, col, radius: 1 }])).map((t) => t.id);

        setTileAnimMap(buildMatchAnimMap(blastIds));
        await delay(RIFKI_ANIM.matchMs);
        setTileAnimMap({});

        let working = prepared;
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]!;

          if (i > 0) {
            const cascade = cascades[i - 1];
            if (cascade?.groups.length) {
              setTileAnimMap(buildMatchAnimMap(cascade.groups.flat().map((tile) => tile.id)));
              await delay(RIFKI_ANIM.matchMs);
              setTileAnimMap({});
              working = removeMatches(working, cascade.groups);
            }
          }

          const beforeStep = i === 0 ? prepared : working;
          const gravityMap = buildGravityAnimMap(beforeStep, step);
          const stoneFallMap = buildStoneFallAnimMap(findNewStoneIds(beforeStep, step), isFlood && i === 0);
          setTileAnimMap(mergeAnimMaps(gravityMap, stoneFallMap));
          setGrid(step);
          working = step;
          await delay(RIFKI_ANIM.fallSettleMs);
          setTileAnimMap({});
        }

        const nextMatched = { ...matchedColors };
        for (const cascade of cascades) {
          for (const group of cascade.groups) {
            for (const t of group) {
              nextMatched[t.color] = (nextMatched[t.color] ?? 0) + 1;
            }
          }
        }

        let nextEnemy = enemyRef.current;
        const { enemyState, enemyWasKilled } = applyEnemyFromCascades(cascades, nextEnemy);
        nextEnemy = enemyState;

        const nextScore = score + totalScore;
        const nextMoves = movesLeft - 1;
        setScore(nextScore);
        setMovesLeft(nextMoves);
        setMatchedColors(nextMatched);

        if (nextEnemy && enemyWasKilled) {
          setEnemy({ ...nextEnemy, isAnimating: false });
        } else {
          setEnemy(nextEnemy ? { ...nextEnemy, isAnimating: false } : null);
        }

        if (gameStatusRef.current === 'playing' && !hasAnyValidMove(working)) {
          setGrid(shuffleGridWithValidMoves(working));
          setBanner(tr('eglence.rifki.hamleKalmadi'));
        }

        evaluateOutcome(nextScore, nextMoves, nextMatched);
      } finally {
        setIsAnimating(false);
      }
    },
    [applyEnemyFromCascades, evaluateOutcome, grid, matchedColors, movesLeft, score, tr],
  );

  const playInvalidSwap = useCallback(
    async (from: { row: number; col: number }, to: { row: number; col: number }) => {
      const fromTile = grid[from.row]?.[from.col];
      const toTile = grid[to.row]?.[to.col];
      if (!fromTile || !toTile) {
        setSelectedTile(null);
        return;
      }

      setIsAnimating(true);
      setTileAnimMap(buildShakeAnimMap([fromTile.id, toTile.id]));
      await delay(RIFKI_ANIM.shakeMs);
      setTileAnimMap({});
      setSelectedTile(null);
      setIsAnimating(false);
    },
    [grid],
  );

  const onTilePress = useCallback(
    (row: number, col: number) => {
      if (isAnimating || gameStatus !== 'playing') return;
      const tile = grid[row]?.[col];
      if (!tile || isStoneTile(tile)) return;

      const now = Date.now();
      const lastTap = lastTapRef.current;
      if (
        tile.power === 'GC_TEK' &&
        lastTap &&
        lastTap.row === row &&
        lastTap.col === col &&
        now - lastTap.time < DOUBLE_TAP_MS
      ) {
        lastTapRef.current = null;
        void activateGcTek(row, col);
        return;
      }
      lastTapRef.current = { row, col, time: now };

      if (!selectedTile) {
        setSelectedTile({ row, col });
        return;
      }

      if (selectedTile.row === row && selectedTile.col === col) {
        setSelectedTile(null);
        return;
      }

      if (!isValidSwap(grid, selectedTile.row, selectedTile.col, row, col)) {
        void playInvalidSwap(selectedTile, { row, col });
        return;
      }

      void resolveSwap(selectedTile, { row, col });
    },
    [activateGcTek, gameStatus, grid, isAnimating, playInvalidSwap, resolveSwap, selectedTile],
  );

  const stonePressure = useMemo(() => materialPressureRatio(materialVolume), [materialVolume]);

  const characterMood = useMemo(() => {
    if (gameStatus === 'game_over_enemy') return 'sad' as const;
    if (gameStatus === 'level_complete') return 'happy' as const;
    if (isMaterialRelief(materialVolume)) return 'happy' as const;
    if (enemy && enemy.position <= 2) return 'scared' as const;
    return 'idle' as const;
  }, [enemy, gameStatus, materialVolume]);

  const arenaWidth = Math.max(0, windowWidth - 32);

  const statusModalVisible = gameStatus !== 'playing';

  if (!canPlay) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <View style={styles.loginGate}>
          <Text style={[styles.loginTitle, { color: '#FFF7ED' }]}>{tr('eglence.rifki.loginTitle')}</Text>
          <Text style={[styles.loginBody, { color: '#A8A29E' }]}>
            {tr('eglence.rifki.loginBody')}
          </Text>
          <Pressable
            style={[styles.modalBtn, { backgroundColor: t.accent }]}
            onPress={() => router.push('/(tabs)/profil' as Href)}>
            <Text style={styles.modalBtnText}>{tr('eglence.rifki.hesapGit')}</Text>
          </Pressable>
          <Pressable style={styles.modalGhostBtn} onPress={() => router.replace('/(tabs)/eglence' as Href)}>
            <Text style={[styles.modalGhostText, { color: '#A8A29E' }]}>{tr('eglence.rifki.eglenceHubaDon')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, { minHeight: windowWidth }]}
        keyboardShouldPersistTaps="handled">
          <RifkiHeader
            score={score}
            movesLeft={movesLeft}
            level={currentLevel}
            levelName={levelConfig.name}
            targetScore={levelConfig.targetScore}
            targetMatches={levelConfig.targetMatches}
            matchedColors={matchedColors}
            textColor={t.text}
            mutedColor={t.muted}
            accentColor={t.accent}
          />

          <RifkiArenaScene
            width={arenaWidth}
            enemyPosition={enemy?.position ?? 7}
            enemyType={enemy?.type ?? 'YILAN'}
            enemyVisible={Boolean(enemy) || enemyDying}
            enemyDying={enemyDying}
            pushToken={enemyPushToken}
            spawnToken={enemySpawnToken}
            drainToken={materialDrainToken}
            materialVolume={materialVolume}
            mood={characterMood}
          />

          <RifkiGrid
            grid={grid}
            selectedTile={selectedTile}
            onTilePress={onTilePress}
            disabled={isAnimating || gameStatus !== 'playing'}
            accentSoft={t.accentSoft}
            layoutWidth={arenaWidth}
            tileAnimMap={tileAnimMap}
            stonePressure={stonePressure}
          />

          {banner ? <Text style={[styles.banner, { color: t.accent }]}>{banner}</Text> : null}

          {__DEV__ && isExpoGo && devBypassAuth && !user ? (
            <Text style={[styles.devBanner, { color: t.muted }]}>
              Dev mod: giriş atlandı — sadece oyun mekaniği testi
            </Text>
          ) : null}

          {__DEV__ ? (
            <Text style={[styles.devBanner, { color: t.muted }]}>
              4&apos;lü → GC tek (çift dokun) · 5&apos;li → GC çift
            </Text>
          ) : null}

          <Pressable style={[styles.exitBtn, { borderColor: t.border }]} onPress={() => router.back()}>
            <Text style={[styles.exitText, { color: t.muted }]}>{tr('eglence.rifki.cikis')}</Text>
          </Pressable>
      </ScrollView>

      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: t.panel, borderColor: t.border }]}>
            {gameStatus === 'level_complete' ? (
              <>
                <Text style={[styles.modalTitle, { color: t.success }]}>{tr('eglence.rifki.levelTamam')}</Text>
                <Text style={[styles.modalBody, { color: t.text }]}>
                  {tr('eglence.rifki.levelTamamBody', { skor: score, hamle: movesLeft })}
                </Text>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: t.accent }]}
                  onPress={() => resetLevel(currentLevel + 1)}>
                  <Text style={styles.modalBtnText}>{tr('eglence.rifki.sonrakiLevel')}</Text>
                </Pressable>
                <Pressable style={styles.modalGhostBtn} onPress={() => router.back()}>
                  <Text style={[styles.modalGhostText, { color: t.muted }]}>{tr('eglence.rifki.hubaDon')}</Text>
                </Pressable>
              </>
            ) : null}

            {gameStatus === 'game_over_moves' ? (
              <>
                <Text style={[styles.modalTitle, { color: t.accent }]}>{tr('eglence.rifki.hamleBitti')}</Text>
                <Text style={[styles.modalBody, { color: t.text }]}>
                  {tr('eglence.rifki.hamleBittiBody', { hedef: levelConfig.targetScore, skor: score })}
                </Text>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: t.accent }]}
                  onPress={() => resetLevel(currentLevel)}>
                  <Text style={styles.modalBtnText}>{tr('eglence.rifki.tekrarDene')}</Text>
                </Pressable>
                <Pressable style={styles.modalGhostBtn} onPress={() => router.back()}>
                  <Text style={[styles.modalGhostText, { color: t.muted }]}>{tr('eglence.rifki.cikis')}</Text>
                </Pressable>
              </>
            ) : null}

            {gameStatus === 'game_over_enemy' ? (
              <>
                <Text style={[styles.modalTitle, { color: t.danger }]}>{tr('eglence.rifki.rifkiYakalandi')}</Text>
                <Text style={[styles.modalBody, { color: t.text }]}>{tr('eglence.rifki.dusmanYaklasti')}</Text>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: t.accent }]}
                  onPress={() => resetLevel(currentLevel)}>
                  <Text style={styles.modalBtnText}>{tr('eglence.rifki.tekrarDene')}</Text>
                </Pressable>
                <Pressable style={styles.modalGhostBtn} onPress={() => router.back()}>
                  <Text style={[styles.modalGhostText, { color: t.muted }]}>{tr('eglence.rifki.cikis')}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  banner: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  devBanner: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  exitBtn: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  exitText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  modalBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#1A1008',
    fontSize: 16,
    fontWeight: '800',
  },
  modalGhostBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  modalGhostText: {
    fontSize: 14,
    fontWeight: '700',
  },
  loginGate: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFF7ED',
  },
  loginBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#A8A29E',
  },
});
