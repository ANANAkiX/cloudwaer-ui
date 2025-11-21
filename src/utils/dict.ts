import { ref, onMounted, watch, Ref } from 'vue'
import { getDictByType, DictItem } from '@/api/dict'

const dictCache = new Map<string, DictItem[]>()
const loadingCache = new Map<string, Promise<DictItem[]>>()

export function useDict(types: string[] | Ref<string[]>) {
  const localTypes = Array.isArray(types) ? ref(types) as Ref<string[]> : types
  const dicts = ref<Record<string, DictItem[]>>({})
  const loading = ref(false)

  const fetchType = async (type: string) => {
    if (!type) return [] as DictItem[]
    if (dictCache.has(type)) {
      return dictCache.get(type) as DictItem[]
    }
    if (loadingCache.has(type)) {
      return loadingCache.get(type) as Promise<DictItem[]>
    }
    const p = getDictByType(type).then(list => {
      dictCache.set(type, list || [])
      loadingCache.delete(type)
      return list || []
    }).catch(_e => {
      loadingCache.delete(type)
      return [] as DictItem[]
    })
    loadingCache.set(type, p)
    return p
  }

  const load = async () => {
    loading.value = true
    const tps = localTypes.value || []
    const results = await Promise.all(tps.map(tp => fetchType(tp)))
    const map: Record<string, DictItem[]> = {}
    tps.forEach((tp, idx) => map[tp] = results[idx] || [])
    dicts.value = map
    loading.value = false
  }

  const refresh = async (type?: string) => {
    if (type) {
      dictCache.delete(type)
      await fetchType(type)
      dicts.value = { ...dicts.value, [type]: dictCache.get(type) || [] }
      return
    }
    // 全量刷新
    for (const key of Array.from(dictCache.keys())) {
      dictCache.delete(key)
    }
    await load()
  }

  onMounted(load)
  watch(localTypes, load, { deep: true })

  return { dicts, loading, refresh }
}

export function mapDictOptions(list: DictItem[], valueField: 'value' | 'code' = 'value', labelField: 'label' | 'value' = 'label') {
  return (list || []).map(item => ({
    value: (item as any)[valueField],
    label: (item as any)[labelField],
    raw: item
  }))
}
