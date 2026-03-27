"use client";

import { useState, useRef } from "react";
import { Share2 } from "lucide-react";

interface ShareItem {
  rank: number;
  title: string;
  subtitle: string;
  playCount: number;
  totalListeningTime?: number;
  loved?: boolean;
  rating?: number;
  averageRating?: number;
  artworkUrl?: string;
}

interface ShareButtonProps {
  title: string;
  items: ShareItem[];
  sortMode?: "plays" | "time";
  artworkShape?: "square" | "circle";
}

export default function ShareButton({ title, items, sortMode = "plays", artworkShape = "square" }: ShareButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formatNumber = (num: number): string => num.toLocaleString();

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

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

  const drawHalfStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, cy - size / 2, size / 2, size);
    ctx.clip();
    drawStar(ctx, cx, cy, size, true);
    ctx.restore();
    
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(cx + size / 2, cy - size / 2, size / 2, size);
    ctx.clip();
    drawStar(ctx, cx, cy, size, false);
    ctx.restore();
  };

  const drawStars = (ctx: CanvasRenderingContext2D, rating: number, x: number, y: number, size: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    ctx.fillStyle = "#ff0436";
    for (let i = 0; i < 5; i++) {
      const starX = x + i * (size + 4);
      if (i < fullStars) {
        drawStar(ctx, starX, y, size, true);
      } else if (i === fullStars && hasHalfStar) {
        drawHalfStar(ctx, starX, y, size);
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        drawStar(ctx, starX, y, size, false);
      }
    }
  };

  const generateImage = async (format: "story" | "grid") => {
    setIsGenerating(true);
    setShowMenu(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      // Dimensions
      const width = format === "story" ? 2160 : 3072;
      const height = 3840;
      canvas.width = width;
      canvas.height = height;

      // Background - exact match to site
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      // Container with border (like the card on site)
      const containerPadding = 80;
      const containerX = containerPadding;
      const containerY = containerPadding;
      const containerWidth = width - containerPadding * 2;
      const containerHeight = height - containerPadding * 2;
      
      // Card background
      ctx.fillStyle = "#1a1a1a";
      drawRoundedRect(ctx, containerX, containerY, containerWidth, containerHeight, 40);
      ctx.fill();
      
      // Card border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, containerX, containerY, containerWidth, containerHeight, 40);
      ctx.stroke();

      // Header area
      const headerPadding = 60;
      const headerY = containerY + headerPadding + 50;

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 70px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(title, containerX + headerPadding, headerY);
      
      let yOffset = headerY;

      // Music Replay text (top right, above badge)
      ctx.fillStyle = "#666666";
      ctx.font = "36px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("Music Replay", containerX + containerWidth - headerPadding, headerY);

      // Sort mode badge (top right, below Music Replay)
      const badgeText = sortMode === "plays" ? "Plays" : "Time";
      ctx.font = "bold 38px -apple-system, BlinkMacSystemFont, sans-serif";
      const badgeWidth = ctx.measureText(badgeText).width + 40;
      const badgeX = containerX + containerWidth - headerPadding - badgeWidth;
      const badgeY = headerY + 20;
      
      // Badge background (gradient)
      const badgeGradient = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeWidth, badgeY + 60);
      badgeGradient.addColorStop(0, "#ff0436");
      badgeGradient.addColorStop(1, "#d00330");
      ctx.fillStyle = badgeGradient;
      drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, 60, 30);
      ctx.fill();
      
      // Badge text
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 44);

      yOffset += 120;

      // Items - redesigned layout with larger fonts and better spacing
      const itemPadding = 30;
      const artworkSize = 300;
      const maxItems = 10;
      
      // First pass: calculate total height needed for vertical centering
      const itemHeights = [];
      let totalContentHeight = 0;

      // Calculate heights for each item
      for (let i = 0; i < Math.min(items.length, maxItems); i++) {
        const item = items[i];
        const textX = containerX + itemPadding + 100 + artworkSize + 40;
        const rightX = containerX + containerWidth - itemPadding - 40;
        const availableWidth = rightX - textX - 20;
        
        // Calculate title lines
        ctx.font = "bold 42px -apple-system, BlinkMacSystemFont, sans-serif";
        const titleWords = item.title.split(" ");
        let titleLineCount = 0;
        let currentLine = "";
        
        for (const word of titleWords) {
          const testLine = currentLine + (currentLine ? " " : "") + word;
          const lineWidth = ctx.measureText(testLine).width;
          
          if (lineWidth > availableWidth - 180 && currentLine) {
            titleLineCount++;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) titleLineCount++;
        
        // Calculate artist lines
        const parts = item.subtitle.split(" · ");
        const artistText = parts[0];
        const albumText = parts.length > 1 ? parts.slice(1).join(" · ") : "";
        
        ctx.font = "36px -apple-system, BlinkMacSystemFont, sans-serif";
        const artistWords = artistText.split(" ");
        let artistLineCount = 0;
        currentLine = "";
        
        for (const word of artistWords) {
          const testLine = currentLine + (currentLine ? " " : "") + word;
          const lineWidth = ctx.measureText(testLine).width;
          
          if (lineWidth > availableWidth && currentLine) {
            artistLineCount++;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) artistLineCount++;
        
        // Calculate album lines
        ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, sans-serif";
        const albumWords = albumText.split(" ");
        let albumLineCount = 0;
        currentLine = "";
        
        for (const word of albumWords) {
          const testLine = currentLine + (currentLine ? " " : "") + word;
          const lineWidth = ctx.measureText(testLine).width;
          
          if (lineWidth > availableWidth && currentLine) {
            albumLineCount++;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) albumLineCount++;
        
        const itemHeight = Math.max(
          artworkSize + 20,
          (titleLineCount * 46) + (artistLineCount * 40) + (albumLineCount * 40) + 50
        );
        itemHeights.push(itemHeight);
        totalContentHeight += itemHeight + 30;
      }
      
      // Calculate starting Y for vertical centering
      const availableHeight = containerHeight - 200;
      let currentY = containerY + 140 + Math.max(0, (availableHeight - totalContentHeight) / 2);
      
      // Second pass: actually draw the items
      for (let i = 0; i < Math.min(items.length, maxItems); i++) {
        const item = items[i];
        const itemX = containerX + itemPadding;
        const itemStartY = currentY;
        const itemHeight = itemHeights[i];

        // Rank number
        ctx.fillStyle = "#666666";
        ctx.font = "bold 46px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`${item.rank}`, itemX + 60, itemStartY + 60);

        // Artwork - positioning depends on section type
        const artX = itemX + 80;
        // For artists (circle), center vertically; for songs/albums (square), align to top
        const artY = artworkShape === "circle" 
          ? itemStartY + (itemHeight - artworkSize) / 2
          : itemStartY;

        if (item.artworkUrl) {
          try {
            const img = await loadImage(item.artworkUrl);
            ctx.save();
            if (artworkShape === "circle") {
              ctx.beginPath();
              ctx.arc(artX + artworkSize / 2, artY + artworkSize / 2, artworkSize / 2, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
            } else {
              drawRoundedRect(ctx, artX, artY, artworkSize, artworkSize, 16);
              ctx.clip();
            }
            ctx.drawImage(img, artX, artY, artworkSize, artworkSize);
            ctx.restore();
          } catch {
            // Fallback placeholder
            ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
            if (artworkShape === "circle") {
              ctx.beginPath();
              ctx.arc(artX + artworkSize / 2, artY + artworkSize / 2, artworkSize / 2, 0, Math.PI * 2);
              ctx.fill();
            } else {
              drawRoundedRect(ctx, artX, artY, artworkSize, artworkSize, 16);
              ctx.fill();
            }
          }
        }

        // Text area - calculate available width
        const textX = artX + artworkSize + 30;
        const rightX = containerX + containerWidth - itemPadding - 30;
        const availableWidth = rightX - textX - 20;
        
        // For artists (circle), center text vertically; for songs/albums, align with artwork top
        let textY = artworkShape === "circle"
          ? itemStartY + (itemHeight - ((2 * 40) + 10)) / 2 + 38
          : artY + 42;

        // Title line with heart and stars - reduced font
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 42px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "left";
        
        // Word wrap title
        const titleWords = item.title.split(" ");
        const titleLines = [];
        let titleLine = "";
        
        for (const word of titleWords) {
          const testLine = titleLine + (titleLine ? " " : "") + word;
          const lineWidth = ctx.measureText(testLine).width;
          
          if (lineWidth > availableWidth - 180 && titleLine) {
            titleLines.push(titleLine);
            titleLine = word;
          } else {
            titleLine = testLine;
          }
        }
        if (titleLine) titleLines.push(titleLine);
        
        // Draw title lines
        for (let i = 0; i < titleLines.length; i++) {
          ctx.fillText(titleLines[i], textX, textY);
          textY += 46;
        }
        
        // Draw heart and stars on separate line after title
        textY -= 6;
        let iconX = textX;
        if (item.loved) {
          ctx.fillStyle = "#ff0436";
          ctx.font = "34px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillText("♥", iconX, textY);
          iconX += 48;
        }
        
        if (item.rating && item.rating > 0) {
          drawStars(ctx, item.rating, iconX, textY - 12, 24);
        } else if (item.averageRating && item.averageRating > 0) {
          drawStars(ctx, item.averageRating, iconX, textY - 12, 24);
        }

        textY += 32;

        // Parse subtitle to separate artist and album
        const parts = item.subtitle.split(" · ");
        const artistText = parts[0];
        const albumText = parts.length > 1 ? parts.slice(1).join(" · ") : "";

        // Artist section - separate line(s), smaller font
        ctx.fillStyle = "#999999";
        ctx.font = "36px -apple-system, BlinkMacSystemFont, sans-serif";
        
        const artistWords = artistText.split(" ");
        let artistLine = "";
        
        for (const word of artistWords) {
          const testLine = artistLine + (artistLine ? " " : "") + word;
          const testWidth = ctx.measureText(testLine).width;
          
          if (testWidth > availableWidth && artistLine) {
            ctx.fillText(artistLine, textX, textY);
            textY += 40;
            artistLine = word;
          } else {
            artistLine = testLine;
          }
        }
        if (artistLine) {
          ctx.fillText(artistLine, textX, textY);
          textY += 40;
        }
        
        // Album section - separate line(s), bold and smaller font
        if (albumText) {
          ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, sans-serif";
          const albumWords = albumText.split(" ");
          let albumLine = "";
          
          for (const word of albumWords) {
            const testLine = albumLine + (albumLine ? " " : "") + word;
            const testWidth = ctx.measureText(testLine).width;
            
            if (testWidth > availableWidth && albumLine) {
              ctx.fillText(albumLine, textX, textY);
              textY += 40;
              albumLine = word;
            } else {
              albumLine = testLine;
            }
          }
          if (albumLine) {
            ctx.fillText(albumLine, textX, textY);
          }
        }

        // Play count (right aligned, vertically centered)
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 46px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(formatNumber(item.playCount), rightX, itemStartY + itemHeight / 2);

        // Listening time (below play count)
        if (item.totalListeningTime && item.totalListeningTime > 0) {
          ctx.fillStyle = "#999999";
          ctx.font = "36px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillText(formatDuration(item.totalListeningTime), rightX, itemStartY + itemHeight / 2 + 44);
        }

        currentY += itemHeight + 30;
      }

      // Download
      const link = document.createElement("a");
      const sanitizedTitle = title.toLowerCase().replace(/\s+/g, "-");
      link.download = `music-replay-${sanitizedTitle}-${format}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isGenerating}
        className="flex items-center gap-1.5 rounded-full border border-card-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/5 disabled:opacity-50"
        title="Share as image"
      >
        {isGenerating ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-card-border border-t-accent" />
        ) : (
          <Share2 size={12} />
        )}
      </button>

      {showMenu && !isGenerating && (
        <div className="absolute right-0 top-full mt-1 z-50 flex flex-col gap-1 rounded-lg border border-card-border bg-black p-2 shadow-xl">
          <button
            onClick={() => generateImage("story")}
            className="whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium text-left hover:bg-white/5 transition-colors"
          >
            Story (2160×3840)
          </button>
          <button
            onClick={() => generateImage("grid")}
            className="whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium text-left hover:bg-white/5 transition-colors"
          >
            Grid (3072×3840)
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
