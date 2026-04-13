const fs = require('fs');
let code = fs.readFileSync('app/kitchen.tsx', 'utf8');

// 1. Add showAlert implementation right after imports
const showAlertImpl = `
const showAlert = (title: string, message?: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      if (buttons.length === 1) {
        window.alert(title + (message ? '\\n' + message : ''));
        if (buttons[0].onPress) buttons[0].onPress();
      } else {
        const isConfirm = window.confirm(title + (message ? '\\n' + message : ''));
        if (isConfirm) {
          const confirmBtn = buttons.find((b: any) => b.style !== 'cancel' && b.text !== 'Cancel');
          if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
        } else {
          const cancelBtn = buttons.find((b: any) => b.style === 'cancel' || b.text === 'Cancel');
          if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
        }
      }
    } else {
      window.alert(title + (message ? '\\n' + message : ''));
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
`;

code = code.replace(/import { useSafeAreaInsets } [^\n]*\n/, match => match + '\n' + showAlertImpl + '\n');

// 2. Replace Alert.alert with showAlert globally
code = code.replace(/Alert\.alert\(/g, 'showAlert(');

// 3. Fix handleBulkDelete specifically
const oldBulkDelete = `
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const execBulkDelete = async () => {
      try {
        const promises = selectedIds.map(id =>
          deleteDoc(doc(db, 'kitchens', uid, 'items', id))
        );
        await Promise.all(promises);
        setIsDeleteMode(false);
        setSelectedIds([]);
        if (Platform.OS !== 'web') showAlert('Success', 'Items removed.');
      } catch (e: any) {
        if (Platform.OS !== 'web') showAlert('Error', 'Failed to delete some items.');
        else window.alert('Failed to delete some items.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(\`Are you sure you want to remove \${selectedIds.length} items from your menu?\`)) {
        execBulkDelete();
      }
    } else {
      showAlert(
        'Delete Selected?',
        \`Are you sure you want to remove \${selectedIds.length} items from your menu?\`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete All', style: 'destructive', onPress: execBulkDelete }
        ]
      );
    }
  };`;

const newBulkDelete = `
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const execBulkDelete = async () => {
      try {
        const promises = selectedIds.map(id =>
          deleteDoc(doc(db, 'kitchens', uid, 'items', id))
        );
        await Promise.all(promises);
        showAlert('Success', 'Items removed.');
      } catch (e: any) {
        showAlert('Error', 'Failed to delete some items.');
      } finally {
        setIsDeleteMode(false);
        setSelectedIds([]);
      }
    };

    showAlert(
      'Delete Selected?',
      \`Are you sure you want to remove \${selectedIds.length} items from your menu?\`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: execBulkDelete }
      ]
    );
  };`;
  
code = code.replace(/const handleBulkDelete = async \(\) => {[\s\S]*?};\n/, newBulkDelete + '\n');

const oldDeleteItem = `
  const deleteItem = async (itemId: string) => {
    const execDelete = async () => {
      try {
        await deleteDoc(doc(db, 'kitchens', uid, 'items', itemId));
      } catch (e: any) {
        if (Platform.OS !== 'web') showAlert('Error', e?.message || 'Failed to remove item');
        else window.alert('Failed to remove item' + (e?.message ? ': ' + e.message : ''));
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Remove item? This will remove the dish from your menu for all users.')) {
        execDelete();
      }
    } else {
      showAlert(
        'Remove item?',
        'This will remove the dish from your menu for all users.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: execDelete },
        ],
      );
    }
  };`;

const newDeleteItem = `
  const deleteItem = async (itemId: string) => {
    const execDelete = async () => {
      try {
        await deleteDoc(doc(db, 'kitchens', uid, 'items', itemId));
      } catch (e: any) {
        showAlert('Error', e?.message || 'Failed to remove item');
      }
    };

    showAlert(
      'Remove item?',
      'This will remove the dish from your menu for all users.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: execDelete },
      ],
    );
  };`;

code = code.replace(/const deleteItem = async \(itemId: string\) => {[\s\S]*?};\n/, newDeleteItem + '\n');

// Also fix historyDateFilter
code = code.replace(/useState<'all' \| 'today' \| 'month'>\('all'\);/, "useState<'all' | 'today' | 'month'>('today');");

// Add 'out_for_delivery' to the UI in OrderCard if it isn't rendered
if (!code.includes("out_for_delivery' && (")) {
  code = code.replace(
    /({order\.status === 'delivered' && \([\s\S]*?<\/View>\n\s*?\)})/g, 
    "$1\n\n      {order.status === 'out_for_delivery' && (\n        <View style={{ backgroundColor: 'rgba(52,199,89,0.1)', borderRadius: 10, padding: 12, gap: 10 }}>\n          <Text style={{ color: theme.green, fontWeight: '700', textAlign: 'center' }}>🚚 Out for Delivery</Text>\n          <Button label=\"Mark as Delivered\" color={theme.green} onPress={() => onMarkDelivered(order)} />\n        </View>\n      )}"
  );
  // Actually we need to make it more precise in the order status blocks
}

fs.writeFileSync('app/kitchen.tsx', code);
