// Ikon garis tunggal, mengikuti DESIGN.md Bagian 7: tebal 1,5, ujung tumpul,
// tanpa isian, mewarisi warna teks induknya. Digambar sendiri supaya tidak
// menambah pustaka ikon hanya untuk enam bentuk.

const dasar = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const IkonPindai = (p) => (
  <svg {...dasar} {...p}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M4 12h16" />
  </svg>
);

export const IkonSegel = (p) => (
  <svg {...dasar} {...p}>
    <path d="M12 3l7 3v5c0 4.5-2.9 8.2-7 10-4.1-1.8-7-5.5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const IkonRiwayat = (p) => (
  <svg {...dasar} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IkonAduan = (p) => (
  <svg {...dasar} {...p}>
    <path d="M12 4l8.5 15H3.5L12 4z" />
    <path d="M12 10v4M12 16.5v.5" />
  </svg>
);

export const IkonBeranda = (p) => (
  <svg {...dasar} {...p}>
    <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1v-8.5z" />
  </svg>
);

export const IkonBantuan = (p) => (
  <svg {...dasar} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.5.2-.7.6-.7 1.1v.5M12 16.5v.5" />
  </svg>
);

export const IkonMata = ({ tertutup = false, ...p }) => (
  <svg {...dasar} {...p}>
    {tertutup ? (
      <>
        <path d="M3 12s3.5-6 9-6c1.6 0 3 .5 4.2 1.2M21 12s-3.5 6-9 6c-1.6 0-3-.5-4.2-1.2" />
        <path d="M4 4l16 16" />
      </>
    ) : (
      <>
        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    )}
  </svg>
);
