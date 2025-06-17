import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { ModelInfo, formatTokenCount, formatPricing, PROVIDER_CONFIGS } from "@/lib/models";
import { Eye, Wrench, X, Check } from "lucide-react";

interface ModelTooltipProps {
  modelInfo: ModelInfo;
  children: React.ReactNode;
}

export function ModelTooltip({ modelInfo, children }: ModelTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const provider = PROVIDER_CONFIGS[modelInfo.provider];

  useEffect(() => {
    if (!visible) return;
    const handleScroll = () => setVisible(false);
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [visible]);

  const showTooltip = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) {
      // Better positioning that accounts for screen boundaries
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipWidth = 320; // 80 * 4 = 320px (w-80)
      const tooltipHeight = 450; // Approximate tooltip height (increased for new content)

      let left = rect.right + 8;
      let top = rect.top;

      // If tooltip would go off the right edge, position it to the left
      if (left + tooltipWidth > viewportWidth) {
        left = rect.left - tooltipWidth - 8;
      }

      // If tooltip would go off the bottom, position it higher
      if (top + tooltipHeight > viewportHeight) {
        top = Math.max(10, viewportHeight - tooltipHeight - 10);
      }

      // If tooltip would go off the top, position it lower
      if (top < 10) {
        top = 10;
      }

      setCoords({ top, left });
      setVisible(true);
    }
  };

  const hideTooltip = () => setVisible(false);

  const tooltipContent = (
    <div
      style={{ top: coords.top, left: coords.left }}
      className="fixed z-[9999] w-80 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border p-4"
    >
      <div className="flex items-center gap-2 mb-2 border-b border-border pb-2">
        <span className="text-xl">{modelInfo.icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{modelInfo.displayName}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span>{provider?.icon}</span>
            <span>{provider?.name}</span>
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{modelInfo.description}</p>
      
      {/* Token Limits */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div className="bg-muted p-2 rounded-md">
          <div className="text-muted-foreground">Input</div>
          <div className="font-semibold">{formatTokenCount(modelInfo.maxInputTokens)}</div>
        </div>
        <div className="bg-muted p-2 rounded-md">
          <div className="text-muted-foreground">Output</div>
          <div className="font-semibold">{formatTokenCount(modelInfo.maxOutputTokens)}</div>
        </div>
      </div>
      
      {/* Context Window */}
      <div className="bg-muted p-2 rounded-md text-xs mb-2">
        <div className="text-muted-foreground">Context Window</div>
        <div className="font-semibold">{formatTokenCount(modelInfo.contextWindow)}</div>
      </div>
      
      {/* Pricing */}
      {modelInfo.pricing && (
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          <div className="bg-muted p-2 rounded-md">
            <div className="text-muted-foreground">Input $</div>
            <div className="font-semibold">{formatPricing(modelInfo.pricing.input)}/1M</div>
          </div>
          <div className="bg-muted p-2 rounded-md">
            <div className="text-muted-foreground">Output $</div>
            <div className="font-semibold">{formatPricing(modelInfo.pricing.output)}/1M</div>
          </div>
        </div>
      )}
      
      {/* Capabilities */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className={`p-2 rounded-md flex items-center gap-2 ${
          modelInfo.supportsTools 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          <Wrench size={12} />
          <div>
            <div className="font-medium">Tools</div>
            <div className="text-[10px] opacity-75">
              {modelInfo.supportsTools ? 'Supported' : 'Not supported'}
            </div>
          </div>
          {modelInfo.supportsTools ? <Check size={12} /> : <X size={12} />}
        </div>
        
        <div className={`p-2 rounded-md flex items-center gap-2 ${
          modelInfo.isMultimodal 
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                            : 'bg-muted/50 text-muted-foreground'
        }`}>
          <Eye size={12} />
          <div>
            <div className="font-medium">Vision</div>
            <div className="text-[10px] opacity-75">
              {modelInfo.isMultimodal ? 'Supported' : 'Text only'}
            </div>
          </div>
          {modelInfo.isMultimodal ? <Check size={12} /> : <X size={12} />}
        </div>
      </div>
      
      {/* Capability Tags */}
      <div className="flex flex-wrap gap-1">
        {modelInfo.capabilities.map((cap) => (
          <span key={cap} className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-medium">
            {cap}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={wrapperRef} onMouseEnter={showTooltip} onMouseLeave={hideTooltip} className="inline-block">
      {children}
      {visible && ReactDOM.createPortal(tooltipContent, document.body)}
    </div>
  );
} 