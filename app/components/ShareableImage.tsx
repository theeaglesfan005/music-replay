"use client";

import { useState, useRef } from "react";
import { Download, Image as ImageIcon } from "lucide-react";
import { TopSong, TopArtist, TopAlbum, formatNumber } from "../lib/api";

interface ShareableImageProps {
  topSongs: TopSong[];
  topArtists: TopArtist[];
  topAlbums: TopAlbum[];
  filterDescription?: string;
}

type Format = "story" | "grid";

export default function ShareableImage({ topSongs, topArtists, topAlbums, filterDescription }: ShareableImageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [format, setFormat] = useState<Format>("story");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateImage = async (selectedFormat: Format) => {
    setIsGenerating(true);
    setFormat(selectedFormat);

    try {
      // Wait for next frame to ensure canvas is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set dimensions based on format
      const width = selectedFormat === "story" ? 2160 : 3072;
      const height = 3840;
      canvas.width = width;
      canvas.height = height;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#0a0a0a");
      gradient.addColorStop(1, "#1a0a14");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 120px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Music Replay", width / 2, 200);

      if (filterDescription) {
        ctx.fillStyle = "#999999";
        ctx.font = "60px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText(filterDescription, width / 2, 300);
      }

      let yOffset = filterDescription ? 420 : 340;
      const padding = 80;
      const columnWidth = selectedFormat === "story" 
        ? width - padding * 2 
        : (width - padding * 3) / 2;

      // Helper to draw a section
      const drawSection = (title: string, items: Array<{rank: number, title: string, subtitle: string, count: number, rating?: number, averageRating?: number}>, x: number, y: number) => {
        // Section title
        ctx.fillStyle = "#ff0436";
        ctx.font = "bold 80px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(title, x, y);

        let itemY = y + 100;
        const maxItems = 10;

        items.slice(0, maxItems).forEach((item) => {
          // Rank
          ctx.fillStyle = "#666666";
          ctx.font = "bold 50px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(`${item.rank}`, x + 60, itemY);

          // Title
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 52px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.textAlign = "left";
          const titleText = truncateText(ctx, item.title, columnWidth - 200);
          ctx.fillText(titleText, x + 90, itemY);

          // Subtitle with rating
          ctx.fillStyle = "#999999";
          ctx.font = "46px -apple-system, BlinkMacSystemFont, sans-serif";
          const subtitleText = truncateText(ctx, item.subtitle, columnWidth - 200);
          ctx.fillText(subtitleText, x + 90, itemY + 55);

          // Draw stars if rating exists
          if (item.rating && item.rating > 0) {
            drawStars(ctx, item.rating, x + 90 + ctx.measureText(subtitleText).width + 20, itemY + 55, 30);
          } else if (item.averageRating && item.averageRating > 0) {
            drawStars(ctx, item.averageRating, x + 90 + ctx.measureText(subtitleText).width + 20, itemY + 55, 30);
          }

          // Play count
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 48px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(formatNumber(item.count), x + columnWidth - 20, itemY + 20);

          itemY += 130;
        });

        return itemY;
      };

      // Helper to draw stars
      const drawStars = (ctx: CanvasRenderingContext2D, rating: number, x: number, y: number, size: number) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        ctx.fillStyle = "#ff0436";
        for (let i = 0; i < 5; i++) {
          const starX = x + i * (size + 5);
          if (i < fullStars) {
            drawStar(ctx, starX, y - size * 0.6, size, true);
          } else if (i === fullStars && hasHalfStar) {
            drawHalfStar(ctx, starX, y - size * 0.6, size);
          } else {
            ctx.strokeStyle = "#333333";
            ctx.lineWidth = 2;
            drawStar(ctx, starX, y - size * 0.6, size, false);
          }
        }
      };

      // Helper to draw a star shape
      const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, filled: boolean) => {
        const spikes = 5;
        const outerRadius = size / 2;
        const innerRadius = size / 4;
        
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        if (filled) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
      };

      // Helper to draw a half star
      const drawHalfStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx, cy - size / 2, size / 2, size);
        ctx.clip();
        drawStar(ctx, cx, cy, size, true);
        ctx.restore();
        
        ctx.save();
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(cx + size / 2, cy - size / 2, size / 2, size);
        ctx.clip();
        drawStar(ctx, cx, cy, size, false);
        ctx.restore();
      };

      // Helper to truncate text
      const truncateText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
        const width = ctx.measureText(text).width;
        if (width <= maxWidth) return text;
        
        let truncated = text;
        while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        return truncated + "...";
      };

      if (selectedFormat === "story") {
        // Story format: vertical layout
        yOffset = drawSection(
          "Top 10 Songs",
          topSongs.slice(0, 10).map(s => ({
            rank: s.rank,
            title: s.name,
            subtitle: `${s.artist} · ${s.album}`,
            count: s.playCount,
            rating: s.rating,
          })),
          padding,
          yOffset
        );

        yOffset += 100;
        yOffset = drawSection(
          "Top 10 Artists",
          topArtists.slice(0, 10).map(a => ({
            rank: a.rank,
            title: a.artist,
            subtitle: `${formatNumber(a.uniqueSongs)} songs`,
            count: a.playCount,
          })),
          padding,
          yOffset
        );

        yOffset += 100;
        drawSection(
          "Top 10 Albums",
          topAlbums.slice(0, 10).map(a => ({
            rank: a.rank,
            title: a.album,
            subtitle: a.artist,
            count: a.playCount,
            averageRating: a.averageRating,
          })),
          padding,
          yOffset
        );
      } else {
        // Grid format: two columns
        const leftX = padding;
        const rightX = padding * 2 + columnWidth;

        // Left column: Songs
        const songsEndY = drawSection(
          "Top 10 Songs",
          topSongs.slice(0, 10).map(s => ({
            rank: s.rank,
            title: s.name,
            subtitle: `${s.artist}`,
            count: s.playCount,
            rating: s.rating,
          })),
          leftX,
          yOffset
        );

        // Right column: Artists
        const artistsEndY = drawSection(
          "Top 10 Artists",
          topArtists.slice(0, 10).map(a => ({
            rank: a.rank,
            title: a.artist,
            subtitle: `${formatNumber(a.uniqueSongs)} songs`,
            count: a.playCount,
          })),
          rightX,
          yOffset
        );

        // Albums below (spans both columns or centered)
        const albumsY = Math.max(songsEndY, artistsEndY) + 100;
        drawSection(
          "Top 10 Albums",
          topAlbums.slice(0, 10).map(a => ({
            rank: a.rank,
            title: a.album,
            subtitle: a.artist,
            count: a.playCount,
            averageRating: a.averageRating,
          })),
          leftX,
          albumsY
        );
      }

      // Download the image
      const link = document.createElement("a");
      link.download = `music-replay-${selectedFormat}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-card-border bg-card-bg p-6">
      <div className="mb-4 flex items-center gap-3">
        <ImageIcon size={24} style={{ color: "#FF0436" }} />
        <div>
          <h3 className="text-base font-bold">Share Your Top 10s</h3>
          <p className="text-xs text-muted">Generate shareable images of your top songs, artists, and albums</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => generateImage("story")}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-card-border bg-white/5 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {isGenerating && format === "story" ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-card-border border-t-accent" />
          ) : (
            <Download size={16} />
          )}
          Story (2160×3840)
        </button>
        <button
          onClick={() => generateImage("grid")}
          disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-card-border bg-white/5 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {isGenerating && format === "grid" ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-card-border border-t-accent" />
          ) : (
            <Download size={16} />
          )}
          Grid (3072×3840)
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
