/* biome-ignore-all lint/suspicious/noArrayIndexKey: editable list uses index-based editing */
import { EditableItem } from "./editable-item.tsx";

interface ItemListProps {
	items: string[];
	editingItemIndex: number | null;
	newItemIndices?: Set<number>;
	onStartEdit: (index: number) => void;
	onSaveEdit: (index: number, newValue: string) => void;
	onCancelEdit: () => void;
}

export function ItemList({
	items,
	editingItemIndex,
	newItemIndices,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
}: ItemListProps) {
	return items.map((item, index) => (
		<EditableItem
			key={index}
			value={item}
			isEditing={editingItemIndex === index}
			isNew={newItemIndices?.has(index) ?? false}
			onStartEdit={() => onStartEdit(index)}
			onSave={(newValue) => onSaveEdit(index, newValue)}
			onCancel={onCancelEdit}
		/>
	));
}
