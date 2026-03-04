import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";

export const BadgesView = () => {
  const { badges, visitorInventory } = useContext(GlobalStateContext);

  if (!badges || Object.keys(badges).length === 0) {
    return (
      <div className="text-center py-6">
        <p>No badges available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {Object.values(badges).map((badge) => {
        const { name, description, icon } = badge;
        const hasBadge = visitorInventory?.badges && Object.keys(visitorInventory.badges).includes(name);
        const style = !hasBadge ? { filter: "grayscale(1)" } : { filter: "none" };
        return (
          <div className="tooltip" key={name}>
            <span className="tooltip-content p3" style={{ width: "115px" }}>
              {description}
            </span>
            <img src={icon} alt={name} style={style} />
            <p className="p3">{name}</p>
          </div>
        );
      })}
    </div>
  );
};
