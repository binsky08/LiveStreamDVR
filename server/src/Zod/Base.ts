import { z } from "zod";

export const VideoQuality = z.enum([
    "best",
    "1440p60",
    "1440p",
    "1080p60",
    "1080p",
    "720p60",
    "720p",
    "480p",
    "360p",
    "160p",
    "140p",
    "worst",
    "audio_only",
]);
