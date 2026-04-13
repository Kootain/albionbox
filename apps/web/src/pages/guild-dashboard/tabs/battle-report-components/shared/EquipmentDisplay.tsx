import { cn,getAlbionItemUrl } from '@/lib/utils';
import {AlbionEquipment, AlbionItem} from '@albionbox/shared'


interface ItemSlotProps {
  data: AlbionItem | null;
  large?: boolean;
  className?: string;
  imgClassName?: string;
}

export const ItemSlot = ({ data, large, className, imgClassName }: ItemSlotProps) => (
  <div className={cn(
    "bg-black-bg border rounded-lg flex items-center justify-center relative overflow-hidden",
    large ? "w-14 h-14 sm:w-20 sm:h-20" : "w-10 h-10 sm:w-14 sm:h-14",
    !data ? "border-black-border bg-black-bg/50" : "border-black-border bg-black-bg shadow-inner",
    className
  )}>
    {data?.Type && data.Count > 0 && <img src={getAlbionItemUrl(data.Type, data.Count, data.Quality)} alt="item" className={cn("object-contain drop-shadow-md", large ? "w-12 h-12 sm:w-[4.5rem] sm:h-[4.5rem]" : "w-9 h-9 sm:w-12 sm:h-12", imgClassName)} />}
    {data?.Count && data.Count > 1 && (
      <span className="absolute bottom-0 right-0 text-[10px] font-black bg-black text-white px-1.5 rounded-tl">
        {data.Count}
      </span>
    )}
  </div>
);

interface EquipmentGridProps {
  eq: AlbionEquipment;
}

export const EquipmentGrid = ({ eq }: EquipmentGridProps) => {
  
  const mainHand = eq.MainHand;
  const is2H = mainHand && mainHand.Type.includes('_2H_');
  const offHand = is2H ? mainHand : eq.OffHand;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="flex flex-col gap-2 sm:gap-3">
        <ItemSlot data={eq.Bag} large /> {/* Bag */}
        <ItemSlot data={eq.MainHand} large /> {/* Weapon */}
        <ItemSlot data={eq.Potion} large /> {/* Potion */}
      </div>
      <div className="flex flex-col gap-2 sm:gap-3">
        <ItemSlot data={eq.Head} large /> {/* Head */}
        <ItemSlot data={eq.Armor} large /> {/* Armor */}
        <ItemSlot data={eq.Shoes} large /> {/* Shoes */}
        <ItemSlot data={eq.Mount} large /> {/* Mount */}
      </div>
      <div className="flex flex-col gap-2 sm:gap-3">
        <ItemSlot data={eq.Cape} large /> {/* Cape */}
        <ItemSlot 
          data={offHand} 
          large 
          imgClassName={is2H ? "opacity-30" : ""} 
        /> {/* Offhand */}
        <ItemSlot data={eq.Food} large/> {/* Food */}
      </div>
    </div>
  );
};
