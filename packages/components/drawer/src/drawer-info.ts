import { computed, ref } from 'vue'

const drawerInfo = ref<{
  [key: string]: {
    size: number
    readonly direction: string
  }
}>({})

function useDrawerInfo() {
  const addDrawerInfo = (bodyId: string, direction: string) => {
    drawerInfo.value[bodyId] = {
      size: 0,
      direction,
    }
  }

  const updateDrawerInfo = (bodyId: string, size: number) => {
    drawerInfo.value[bodyId].size = size
  }

  const removeDrawerInfo = (bodyId: string) => {
    delete drawerInfo.value[bodyId]
  }

  const directionInfoMaxSize = computed(() => {
    const directionInfoSizeList: {
      [key: string]: number[]
    } = {}
    for (const key in drawerInfo.value) {
      const direction = drawerInfo.value[key].direction
      const size = drawerInfo.value[key].size
      directionInfoSizeList[direction] = directionInfoSizeList[direction] ?? []
      directionInfoSizeList[direction].push(size)
    }
    const directionInfoMaxSize: {
      [key: string]: number
    } = {}
    for (const direction in directionInfoSizeList) {
      directionInfoMaxSize[direction] = Math.max(
        ...directionInfoSizeList[direction]
      )
    }
    return directionInfoMaxSize
  })
  return {
    drawerInfo,
    addDrawerInfo,
    updateDrawerInfo,
    removeDrawerInfo,
    directionInfoMaxSize,
  }
}

export default useDrawerInfo
