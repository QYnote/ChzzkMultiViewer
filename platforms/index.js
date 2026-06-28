const PLATFORMS = {
  chzzk: ChzzkAdapter,
  soop: SoopAdapter,
};

function getPlatform(id) {
  return PLATFORMS[id] || PLATFORMS.chzzk;
}
