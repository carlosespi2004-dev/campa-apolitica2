import anrlogo from "../img/anrlogo.png";
import logocarmona from "../img/logocarmona.png";

export function ANRLogo({ isMobile }) {
  return (
    <div
      style={{
        width: isMobile ? "80px" : "110px",
        height: isMobile ? "80px" : "110px",
        borderRadius: "50%",
        overflow: "hidden",
        background: "#C8102E",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
        border: "4px solid white"
      }}
    >
      <img
        src={anrlogo}
        alt="Logo ANR"
        style={{
          width: "80%",
          height: "80%",
          objectFit: "contain",
          display: "block"
        }}
      />
    </div>
  );
}

export function GreenHeart() {
  return (
    <img
      src={logocarmona}
      alt="Logo Carmona"
      style={{ width: "50px", height: "50px", borderRadius: "10px" }}
    />
  );
}