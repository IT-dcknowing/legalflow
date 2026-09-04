import React, { useState } from 'react';

interface LegalFlowLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const LegalFlowLogo: React.FC<LegalFlowLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);

  const imgDimensions = {
    sm: 'w-[28px] h-[28px]',
    md: 'w-[36px] h-[36px]',
    lg: 'w-[46px] h-[46px]',
  }[size];

  const textSizes = {
    sm: 'text-[13px]',
    md: 'text-[15.5px]',
    lg: 'text-[19px]',
  }[size];

  const subtitleSizes = {
    sm: 'text-[10px]',
    md: 'text-[11.5px]',
    lg: 'text-[12.5px]',
  }[size];

  return (
    <div
      id="brandLegalFlowLogo"
      onClick={onClick}
      className={`flex items-center gap-[10px] ${onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''} ${className}`}
    >
      {/* Logo Graphic Container */}
      <div
        className={`${imgDimensions} shrink-0 flex items-center justify-center relative rounded-[9px] overflow-hidden`}
        title="Logo officiel Legal Flow"
      >
        {!imgError ? (
          <img
            src="/images/image.png"
            alt="Logo officiel Legal Flow"
            className="w-full h-full object-contain filter drop-shadow-sm select-none"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          /* High-fidelity Vector SVG replica of the official logo */
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full select-none"
          >
            {/* Base stylized 'L' */}
            <path
              d="M18 10C18 7.8 19.8 6 22 6H34C36.2 6 38 7.8 38 10V70C38 74 41 77 45 77H68C72 77 75 79.5 76 83.2C77 87 74 91 70 91H26C21.6 91 18 87.4 18 83V10Z"
              fill="#22248C"
            />
            {/* Scale of justice figure inside crook of L */}
            <circle cx="39" cy="49" r="4.5" fill="#FFFFFF" stroke="#22248C" strokeWidth="1.2" />
            {/* Arms / Balance beam */}
            <path
              d="M26 53.5C29 51 35 52.5 39 53C43 52.5 49 51 52 53.5"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Left Pan */}
            <path d="M26 54L22 69H30L26 54Z" stroke="#FFFFFF" strokeWidth="1.4" fill="#22248C" />
            <path d="M21 69C21 72 31 72 31 69" stroke="#FFFFFF" strokeWidth="1.4" fill="#FFFFFF" />
            {/* Right Pan */}
            <path d="M52 54L48 69H56L52 54Z" stroke="#FFFFFF" strokeWidth="1.4" fill="#22248C" />
            <path d="M47 69C47 72 57 72 57 69" stroke="#FFFFFF" strokeWidth="1.4" fill="#FFFFFF" />
            {/* Flow curves in the foot */}
            <path
              d="M40 70C46 72 55 75 64 68C72 61 74 55 74 54"
              stroke="#22248C"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M44 76C50 78 59 80 68 74C76 68 79 61 79 60"
              stroke="#22248C"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M48 82C54 84 64 85 73 80C81 75 84 68 84 67"
              stroke="#22248C"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* Brand Typography: LEGAL (full black) + FLOW (branding color) with Montserrat Bold */}
      <div className="min-w-0">
        <div
          className={`${textSizes} tracking-tight leading-none flex items-center gap-[4px]`}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <span className="font-bold text-[#000000] tracking-tight">LEGAL</span>
          <span className="font-bold text-[#22248C] tracking-tight">FLOW</span>
        </div>
        {showSubtitle && (
          <span className={`block ${subtitleSizes} text-[#6B6F85] font-medium truncate mt-[3px] leading-tight`}>
            Votre conformité, simplifiée
          </span>
        )}
      </div>
    </div>
  );
};
